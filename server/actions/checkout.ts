"use server";

import { db } from "@/database/db";
import { orders, orderItems, menuItems, itemVariants, itemAddOns } from "@/database/schema";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { STORE_CONSTANTS } from "@/lib/constants";
import { eq, inArray } from "drizzle-orm";
import { getStoreStatus } from "@/server/actions/settings";
import { revalidatePath } from "next/cache";
import { CartItem } from "@/store/use-cart";
import { randomBytes } from "crypto";
import { validateCoupon, calculateCouponDiscount, incrementCouponUsage } from "./coupons";

export async function submitOrder(data: CheckoutValues, cartItems: CartItem[], idempotencyKey: string) {
  try {
    // 1. Validate Input
    const parsed = checkoutSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Invalid form data" };
    }

    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    // 1.5. Validate Store Status
    const isStoreOpen = await getStoreStatus();
    if (!isStoreOpen) {
      return { success: false, error: "The restaurant is currently closed. We are not accepting new orders at this time." };
    }

    // Server-side validation of prices
    const menuItemIds = [...new Set(cartItems.map((item) => item.menuItemId))];
    
    const dbMenuItems = await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds));
    const dbVariants = await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, menuItemIds));
    const dbAddOns = await db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, menuItemIds));

    let calculatedSubtotal = 0;
    const orderItemsPayload: any[] = [];

    // 3. Re-calculate total strictly based on DB records
    for (const item of cartItems) {
      const dbItem = dbMenuItems.find(i => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      let unitPrice = dbItem.basePrice;

      let matchedVariantId = null;
      if (item.variantName) {
        const dbVariant = dbVariants.find(v => v.menuItemId === item.menuItemId && v.name === item.variantName);
        if (dbVariant) {
          unitPrice = dbVariant.price;
          matchedVariantId = dbVariant.id;
        }
      }

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
        specialInstructions: item.specialInstructions || null,
      });
    }

    // 4. Delivery fee: Rs. 0 for pickup
    const isPickup = parsed.data.orderType === "pickup";
    const deliveryFee = isPickup ? 0 : STORE_CONSTANTS.DELIVERY_FEE;

    // 5. Coupon validation and discount
    let discountAmount = 0;
    let validCouponCode: string | null = null;

    if (parsed.data.couponCode) {
      const couponResult = await validateCoupon(
        parsed.data.couponCode,
        calculatedSubtotal
      );
      if (couponResult.valid) {
        discountAmount = await calculateCouponDiscount(
          couponResult,
          orderItemsPayload.map(i => ({ menuItemId: i.menuItemId, subtotal: i.subtotal }))
        );
        validCouponCode = parsed.data.couponCode.toUpperCase().trim();
      }
    }

    const totalAmount = calculatedSubtotal + deliveryFee - discountAmount;

    // 6. Generate order ID
    const entropy = randomBytes(2).toString("hex").toUpperCase();
    const timestampStr = Date.now().toString().slice(-4);
    const orderId = `CC-${timestampStr}${entropy}`;

    // 7. Insert Order and Order Items atomically
    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        orderType: parsed.data.orderType,
        deliveryAddress: isPickup ? null : (parsed.data.deliveryAddress || null),
        deliveryNotes: parsed.data.deliveryNotes || null,
        latitude: parsed.data.latitude || null,
        longitude: parsed.data.longitude || null,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: "unpaid",
        status: "pending",
        subtotal: calculatedSubtotal,
        deliveryFee: deliveryFee,
        discountAmount: discountAmount,
        couponCode: validCouponCode,
        totalAmount: totalAmount,
        idempotencyKey: idempotencyKey,
      });

      await tx.insert(orderItems).values(
        orderItemsPayload.map((payload) => ({
          orderId: orderId,
          ...payload,
        }))
      );
    });

    // 8. Increment coupon usage count
    if (validCouponCode) {
      await incrementCouponUsage(validCouponCode);
    }

    revalidatePath("/admin/orders");

    return { success: true, orderId };
  } catch (error: any) {
    const isDuplicate = 
      error.code === "23505" || 
      error.message?.includes("duplicate key") ||
      error.cause?.code === "23505";
      
    if (isDuplicate) {
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.idempotencyKey, idempotencyKey)
      });
      if (existingOrder) {
        return { success: true, orderId: existingOrder.id, isDuplicate: true };
      }
    }

    console.error("Checkout submission error:", error);
    return { success: false, error: "Failed to process order. Please try again." };
  }
}
