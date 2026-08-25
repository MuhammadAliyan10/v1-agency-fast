"use server";

import { db } from "@/database/db";
import { orders, orderItems, menuItems, itemVariants, itemAddOns } from "@/database/schema";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { STORE_CONSTANTS } from "@/lib/constants";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CartItem } from "@/store/use-cart";

export async function submitOrder(data: CheckoutValues, cartItems: CartItem[]) {
  try {
    // 1. Validate Input
    const parsed = checkoutSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid form data" };
    }

    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    // 2. Server-side validation of prices
    // Fetch all relevant menu items, variants, and addons from the DB to prevent price tampering
    const menuItemIds = [...new Set(cartItems.map((item) => item.menuItemId))];
    
    const dbMenuItems = await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds));
    const dbVariants = await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, menuItemIds));
    const dbAddOns = await db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, menuItemIds));

    let calculatedSubtotal = 0;
    const orderItemsPayload = [];

    // 3. Re-calculate total strictly based on DB records
    for (const item of cartItems) {
      const dbItem = dbMenuItems.find(i => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      let unitPrice = dbItem.basePrice;

      // Check variant price
      let matchedVariantId = null;
      if (item.variantName) {
        const dbVariant = dbVariants.find(v => v.menuItemId === item.menuItemId && v.name === item.variantName);
        if (dbVariant) {
          unitPrice = dbVariant.price;
          matchedVariantId = dbVariant.id;
        }
      }

      // Check addons price
      const matchedAddOns = [];
      if (item.addOns && item.addOns.length > 0) {
        for (const addon of item.addOns) {
          const dbAddon = dbAddOns.find(a => a.menuItemId === item.menuItemId && a.name === addon.name);
          if (dbAddon) {
            unitPrice += dbAddon.price;
            matchedAddOns.push({ id: dbAddon.id, name: dbAddon.name, price: dbAddon.price });
          }
        }
      }

      const itemSubtotal = unitPrice * item.quantity;
      calculatedSubtotal += itemSubtotal;

      orderItemsPayload.push({
        menuItemId: item.menuItemId,
        variantId: matchedVariantId,
        itemName: dbItem.name,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice: unitPrice,
        subtotal: itemSubtotal,
        selectedAddOns: matchedAddOns.length > 0 ? matchedAddOns : null,
      });
    }

    const totalAmount = calculatedSubtotal + STORE_CONSTANTS.DELIVERY_FEE;

    // 4. Generate readable order ID (e.g. CC-59123)
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const orderId = `CC-${randomDigits}`;

    // 5. Insert Order and Order Items sequentially (neon-http does not support transactions)
    await db.insert(orders).values({
      id: orderId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryNotes: parsed.data.deliveryNotes || null,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: parsed.data.paymentMethod === "COD" ? "unpaid" : "pending",
      status: "pending",
      subtotal: calculatedSubtotal,
      deliveryFee: STORE_CONSTANTS.DELIVERY_FEE,
      discountAmount: 0,
      totalAmount: totalAmount,
    });

    await db.insert(orderItems).values(
      orderItemsPayload.map((payload) => ({
        orderId: orderId,
        ...payload,
      }))
    );

    revalidatePath("/admin/orders");

    return { success: true, orderId };
  } catch (error) {
    console.error("Checkout submission error:", error);
    return { success: false, error: "Failed to process order. Please try again." };
  }
}
