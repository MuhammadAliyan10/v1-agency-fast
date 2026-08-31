import { db } from "@/database/db";
import { orders, orderItems, menuItems, whatsappSessions, orderStatusHistory } from "@/database/schema";
import { eq, inArray, sql } from "drizzle-orm";

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
  
  let deliveryNotes = "";
  if (alternatePhone) {
    deliveryNotes = `Alternate Contact: ${alternatePhone}`;
  }

  // 2. Fetch True Pricing & Verify Availability
  const itemIds = cart.map((i: any) => i.menuItemId);
  const dbItems = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));
  
  let subtotal = 0;
  const finalItems = [];

  for (const cartItem of cart) {
    const dbItem = dbItems.find(i => i.id === cartItem.menuItemId);
    if (!dbItem || !dbItem.isAvailable) {
      throw new Error(`Sorry, ${dbItem?.name || "an item"} is currently unavailable.`);
    }
    
    const unitPrice = dbItem.basePrice; // Simplified: ignoring variants in V1 to ensure safety
    const itemSubtotal = unitPrice * cartItem.quantity;
    subtotal += itemSubtotal;
    
    finalItems.push({
      menuItemId: dbItem.id,
      itemName: dbItem.name,
      quantity: cartItem.quantity,
      unitPrice: unitPrice,
      subtotal: itemSubtotal,
    });
  }

  const deliveryFee = 150; // Fixed delivery fee for MVP
  const totalAmount = subtotal + deliveryFee;

  // 3. Create Order
  const orderId = `WA${Math.floor(1000 + Math.random() * 9000)}`;

  await db.insert(orders).values({
    id: orderId,
    customerName,
    customerPhone: phone,
    orderType: "delivery",
    deliveryAddress,
    deliveryNotes,
    status: "pending",
    source: "whatsapp",
    paymentMethod: "COD",
    subtotal,
    deliveryFee,
    totalAmount,
  });

  // 4. Create Order Items
  for (const item of finalItems) {
    await db.insert(orderItems).values({
      orderId,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    });
  }

  // 5. Create Status History
  await db.insert(orderStatusHistory).values({
    orderId,
    toStatus: "pending",
    source: "whatsapp",
  });

  // 6. Update Session State
  await db.update(whatsappSessions)
    .set({ 
      state: "order_created", 
      cart: [], 
      tempData: {},
      updatedAt: new Date()
    })
    .where(eq(whatsappSessions.id, session.id));

  return { orderId, totalAmount, deliveryAddress, customerName };
}
