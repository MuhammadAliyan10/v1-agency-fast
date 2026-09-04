import { db } from "@/database/db";
import crypto from "crypto";
import { Client } from "@upstash/qstash";
import { orders, orderItems, menuItems, whatsappSessions, orderStatusHistory, itemVariants, outboundMessages } from "@/database/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { STORE_CONSTANTS } from "@/lib/constants";

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });

export async function createOrderFromWhatsApp(phone: string, restaurantId: string = "default") {
  // Neon HTTP driver does not support transactions, so we use sequential db queries
  const sessionList = await db.select().from(whatsappSessions).where(
    sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`
  );
  
  if (sessionList.length === 0) throw new Error("No session found");
  const session = sessionList[0];
  
  if (session.state !== "order_confirmation") {
    throw new Error(`Session is in invalid state for checkout: ${session.state}`);
  }

  const cart = (session.cart as any[]) || [];
  if (cart.length === 0) throw new Error("Cart is empty");
  
  const tempData = (session.tempData as any) || {};
  const customerName = tempData.name || "WhatsApp Customer";
  const deliveryAddress = tempData.address || "Unknown Address";
  const alternatePhone = tempData.altPhone || "";
  const latitude = tempData.lat || null;
  const longitude = tempData.long || null;
  
  let deliveryNotes = "";
  if (alternatePhone) {
    deliveryNotes = `Alternate Contact: ${alternatePhone}`;
  }
  
  const specialInstructions = tempData.instructions || "";
  if (specialInstructions && specialInstructions.toLowerCase() !== "none") {
    deliveryNotes += deliveryNotes ? `\nInstructions: ${specialInstructions}` : `Instructions: ${specialInstructions}`;
  }

  const checkoutSessionId = tempData.checkoutSessionId;
  if (!checkoutSessionId) {
    throw new Error("Missing checkout session ID for idempotency.");
  }

  const orderId = `WA${Math.floor(1000 + Math.random() * 9000)}`;
  let finalTotalAmount = 0;
  const finalDeliveryAddress = deliveryAddress;

  // 3. Create Order Atomically using Neon Serverless Pool transactions
  try {
    await db.transaction(async (tx) => {
    // 2. Fetch True Pricing & Verify Availability (INSIDE TX)
    const itemIds = cart.map((i: any) => i.menuItemId);
    const dbItems = await tx.select().from(menuItems).where(inArray(menuItems.id, itemIds));
    
    let subtotal = 0;
    const finalItems = [];

    for (const cartItem of cart) {
      const dbItem = dbItems.find(i => i.id === cartItem.menuItemId);
      if (!dbItem || !dbItem.isAvailable) {
        throw new Error(`Sorry, ${dbItem?.name || "an item"} is currently unavailable.`);
      }
      
      let unitPrice = dbItem.basePrice;
      let finalItemName = dbItem.name;
      let variantId = null;

      if (cartItem.variantId) {
        const variants = await tx.select().from(itemVariants).where(eq(itemVariants.id, cartItem.variantId));
        const variant = variants[0];
        if (variant) {
          unitPrice = variant.price;
          finalItemName = `${dbItem.name} (${variant.name})`;
          variantId = variant.id;
        }
      }

      // Respect Deal Overrides
      if (cartItem.isDeal) {
        unitPrice = cartItem.price !== undefined ? cartItem.price : unitPrice;
        finalItemName = cartItem.name || finalItemName;
      }

      const itemSubtotal = unitPrice * cartItem.quantity;
      subtotal += itemSubtotal;
      
      finalItems.push({
        menuItemId: dbItem.id,
        variantId,
        itemName: finalItemName,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        specialInstructions: cartItem.specialInstructions || null,
      });
    }

    const deliveryFee = STORE_CONSTANTS.WHATSAPP_DELIVERY_FEE;
    const totalAmount = subtotal + deliveryFee;
    finalTotalAmount = totalAmount;

    await tx.insert(orders).values({
      id: orderId,
      trackingToken: crypto.randomUUID(),
      customerName,
      customerPhone: phone,
      orderType: "delivery",
      deliveryAddress,
      deliveryNotes,
      latitude,
      longitude,
      status: "pending",
      source: "whatsapp",
      paymentMethod: "COD",
      subtotal,
      deliveryFee,
      totalAmount,
      checkoutSessionId, // Enforces uniqueness preventing duplicate orders
    });

    // Create Order Items
    for (const item of finalItems) {
      await tx.insert(orderItems).values({
        orderId,
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        specialInstructions: item.specialInstructions,
      });
    }

    // Create Status History
    await tx.insert(orderStatusHistory).values({
      orderId,
      toStatus: "pending",
      source: "whatsapp",
    });

    // Clear session state
    await tx.update(whatsappSessions)
      .set({ 
        state: "order_created", 
        cart: [], 
        tempData: {},
        updatedAt: new Date()
      })
      .where(eq(whatsappSessions.id, session.id));

    // Create Outbound Message inside the transaction
    const trackUrl = `https://agency-fast.vercel.app/track/${orderId}`;
    const textBody = `🎉 Order confirmed! Your Order ID is #${orderId}.\n\nTrack your delivery here: ${trackUrl}\n\nType 'Hi' anytime if you'd like to place another order!`;
    
    await tx.insert(outboundMessages).values({
      phone: phone,
      status: "pending",
      payload: {
        type: "text",
        text: { body: textBody }
      }
    });
    });
  } catch (error: any) {
    const isDuplicate = 
      error.code === "23505" || 
      error.message?.includes("duplicate key") ||
      error.cause?.code === "23505";
      
    if (isDuplicate) {
      // Find the existing order with this checkoutSessionId
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.checkoutSessionId, checkoutSessionId)
      });
      if (existingOrder) {
        return { 
          orderId: existingOrder.id, 
          totalAmount: existingOrder.totalAmount, 
          deliveryAddress: existingOrder.deliveryAddress, 
          customerName: existingOrder.customerName,
          isDuplicate: true 
        };
      }
    }
    throw error; // Re-throw if it wasn't a duplicate checkout or we couldn't find the order
  }

  // Try to dispatch outbox processing immediately (fire and forget)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL; // They set this in Vercel now
    if (baseUrl) {
      await qstashClient.publishJSON({
        url: `${baseUrl}/api/jobs/process-outbox`,
        body: { trigger: "order_created" },
      });
    }
  } catch (e) {
    console.error("Failed to trigger outbox processing directly. Cron will pick it up.", e);
  }

  // Notify Next.js to invalidate the admin orders cache so the new WhatsApp
  // order appears immediately on the Live Orders board without waiting for polling.
  revalidatePath("/admin/orders");

  return { orderId, totalAmount: finalTotalAmount, deliveryAddress: finalDeliveryAddress, customerName };
}
