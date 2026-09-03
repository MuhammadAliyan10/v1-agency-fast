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
    const regularCartItems = cartItems.filter((item) => !item.name.startsWith("[DEAL]"));
    const menuItemIds = [...new Set(regularCartItems.map((item) => item.menuItemId))];

    const dbMenuItems = menuItemIds.length > 0
      ? await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds))
      : [];
    const dbVariants = menuItemIds.length > 0
      ? await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, menuItemIds))
      : [];
    const dbAddOns = menuItemIds.length > 0
      ? await db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, menuItemIds))
      : [];

    let calculatedSubtotal = 0;
    const orderItemsPayload: any[] = [];

    // 3. Re-calculate total strictly based on DB records and perform JIT validation
    for (const item of cartItems) {
      const isDealItem = item.name.startsWith("[DEAL]");

      if (isDealItem) {
        // Deal item validation: fixed deal price & structured instructions for KDS
        const unitPrice = item.unitPrice;
        const itemSubtotal = unitPrice * item.quantity;
        calculatedSubtotal += itemSubtotal;

        // Ensure menuItemId is either a valid UUID or null to prevent DB syntax error
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validMenuItemId: string | null = null;
        if (item.menuItemId) {
          if (uuidRegex.test(item.menuItemId)) {
            validMenuItemId = item.menuItemId;
          } else {
            const match = item.menuItemId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            validMenuItemId = match ? match[0] : null;
          }
        }

        orderItemsPayload.push({
          menuItemId: validMenuItemId,
          variantId: null,
          itemName: item.name,
          variantName: item.variantName || "Combo Deal",
          quantity: item.quantity,
          unitPrice: unitPrice,
          subtotal: itemSubtotal,
          selectedAddOns: item.addOns && item.addOns.length > 0 ? item.addOns : null,
          specialInstructions: item.specialInstructions || null,
        });
        continue;
      }

      // Regular item validation
      const dbItem = dbMenuItems.find(i => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      if (dbItem.isAvailable === false) {
        return { success: false, error: `CART_ITEM_UNAVAILABLE: ${dbItem.name} is no longer available.` };
      }

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
    let deliveryFee = 0;
    let zoneName = "";
    if (!isPickup && parsed.data.deliveryZone) {
      const zone = STORE_CONSTANTS.DELIVERY_ZONES.find(z => z.id === parsed.data.deliveryZone);
      if (zone) {
        deliveryFee = zone.fee;
        zoneName = zone.name;
      } else {
        deliveryFee = STORE_CONSTANTS.DELIVERY_FEE;
      }
    }

    const fullAddress = isPickup
      ? null
      : `${parsed.data.deliveryAddress}${zoneName ? `, Area: ${zoneName}` : ""}`;

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

    // 6. Generate order ID and tracking token
    const entropy = randomBytes(2).toString("hex").toUpperCase();
    const timestampStr = Date.now().toString().slice(-4);
    const orderId = `CC-${timestampStr}${entropy}`;
    const trackingToken = crypto.randomUUID();

    // 7. Insert Order and Order Items atomically
    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        trackingToken: trackingToken,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        orderType: parsed.data.orderType,
        deliveryAddress: fullAddress,
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
        orderItemsPayload.map((payload) => {
          // Check if this specific item is a Deal
          const isDeal = payload.itemName.startsWith("[DEAL]");

          return {
            ...payload,
            orderId: orderId,
            // If it's a deal, send null. If it's normal food, send the ID.
            menuItemId: isDeal ? null : payload.menuItemId,
          };
        })
      );
    });

    // 8. Increment coupon usage count
    if (validCouponCode) {
      await incrementCouponUsage(validCouponCode);
    }

    revalidatePath("/admin/orders");

    return { success: true, orderId, trackingToken };
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
        return { success: true, orderId: existingOrder.id, trackingToken: existingOrder.trackingToken, isDuplicate: true };
      }
    }

    console.error("Checkout submission error:", error);
    return { success: false, error: "Failed to process order. Please try again." };
  }
}
