"use server";

import { db } from "@/database/db";
import { orders, orderItems, menuItems, itemVariants, itemAddOns, deals } from "@/database/schema";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { STORE_CONSTANTS } from "@/lib/constants";
import { eq, inArray } from "drizzle-orm";
import { getStoreStatus } from "@/server/actions/settings";
import { revalidatePath } from "next/cache";
import { CartItem } from "@/lib/store/cart-store";
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

    // ── 2a. Pre-fetch DB prices for regular (non-deal) items ─────────────
    const regularCartItems = cartItems.filter((item) => !item.name.startsWith("[DEAL]"));
    const menuItemIds = [
      ...new Set(
        regularCartItems
          .map((item) => item.menuItemId)
          .filter((id): id is string => id !== null)
      ),
    ];

    const dbMenuItems = menuItemIds.length > 0
      ? await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds))
      : [];
    const dbVariants = menuItemIds.length > 0
      ? await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, menuItemIds))
      : [];
    const dbAddOns = menuItemIds.length > 0
      ? await db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, menuItemIds))
      : [];

    // ── 2b. Pre-fetch DEAL prices from the DB ────────────────────────────
    // Extract unique deal names from cart items whose name is "[DEAL] <name>".
    // We look up each deal by name to obtain the authoritative dealPrice from
    // the database, ensuring the client cannot submit a manipulated unit price.
    const dealCartItems = cartItems.filter((item) => item.name.startsWith("[DEAL]"));
    const dealNameSet = new Set(
      dealCartItems.map((item) => item.name.replace(/^\[DEAL\]\s+/, "").trim())
    );
    const dealNameList = [...dealNameSet];

    // Fetch all active deals whose names match the cart — one query covers all deals.
    const dbDeals =
      dealNameList.length > 0
        ? await db
            .select({ id: deals.id, name: deals.name, dealPrice: deals.dealPrice })
            .from(deals)
            .where(inArray(deals.name, dealNameList))
        : [];

    // Build a lookup: deal name → authoritative dealPrice (used for group validation below)
    // We keep the dbDeals array as the source of truth; no separate Map needed.

    // ── 3. Re-calculate total strictly from DB records ───────────────────
    let calculatedSubtotal = 0;
    const orderItemsPayload: {
      menuItemId: string | null;
      variantId: string | null;
      itemName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      selectedAddOns: { id: string; name: string; price: number }[] | null;
      specialInstructions: string | null;
    }[] = [];

    // Group deal slots by deal name so we can compute per-slot price from total
    const dealSlotGroups = new Map<string, CartItem[]>();
    for (const item of dealCartItems) {
      const name = item.name.replace(/^\[DEAL\]\s+/, "").trim();
      const existing = dealSlotGroups.get(name) ?? [];
      existing.push(item);
      dealSlotGroups.set(name, existing);
    }

    // Validate and price each deal group
    for (const [dealName, slots] of dealSlotGroups) {
      const dbDeal = dbDeals.find((d) => d.name === dealName);

      if (!dbDeal) {
        // Deal no longer exists or has been deactivated — reject the order
        return {
          success: false,
          error: `The deal "${dealName}" is no longer available. Please update your cart.`,
        };
      }

      const authorizedDealTotal = dbDeal.dealPrice;
      const totalSlotQty = slots.reduce((sum, s) => sum + s.quantity, 0);
      // Price per quantity unit across all slots (integer division; remainder absorbed)
      const pricePerQty = totalSlotQty > 0
        ? Math.floor(authorizedDealTotal / totalSlotQty)
        : authorizedDealTotal;

      for (const item of slots) {
        // UUID validation for menuItemId (may be null for custom deal slots)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validMenuItemId: string | null = null;
        if (item.menuItemId) {
          if (uuidRegex.test(item.menuItemId)) {
            validMenuItemId = item.menuItemId;
          } else {
            const match = item.menuItemId.match(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
            );
            validMenuItemId = match ? match[0] : null;
          }
        }

        // Use server-authorised price — never trust item.unitPrice for deals
        const unitPrice = pricePerQty;
        const itemSubtotal = unitPrice * item.quantity;
        calculatedSubtotal += itemSubtotal;

        orderItemsPayload.push({
          menuItemId: validMenuItemId,
          variantId: null,
          itemName: item.name,
          variantName: item.variantName ?? "Combo Deal",
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          selectedAddOns:
            item.addOns && item.addOns.length > 0
              ? item.addOns.map((a) => ({ id: "", name: a.name, price: a.price }))
              : null,
          specialInstructions: item.specialInstructions ?? null,
        });
      }
    }

    // Validate and price regular items
    for (const item of regularCartItems) {
      const dbItem = dbMenuItems.find((i) => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      if (dbItem.isAvailable === false) {
        return {
          success: false,
          error: `${dbItem.name} is no longer available. Please remove it from your cart.`,
        };
      }

      let unitPrice = dbItem.basePrice;
      let matchedVariantId: string | null = null;

      if (item.variantName) {
        const dbVariant = dbVariants.find(
          (v) => v.menuItemId === item.menuItemId && v.name === item.variantName
        );
        if (dbVariant) {
          unitPrice = dbVariant.price;
          matchedVariantId = dbVariant.id;
        }
      }

      const matchedAddOns: { id: string; name: string; price: number }[] = [];
      if (item.addOns && item.addOns.length > 0) {
        for (const addon of item.addOns) {
          const dbAddon = dbAddOns.find(
            (a) => a.menuItemId === item.menuItemId && a.name === addon.name
          );
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
        variantName: item.variantName ?? null,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        selectedAddOns: matchedAddOns.length > 0 ? matchedAddOns : null,
        specialInstructions: item.specialInstructions ?? null,
      });
    }

    // 4. Delivery fee — zone-based, Rs. 0 for pickup
    const isPickup = parsed.data.orderType === "pickup";
    let deliveryFee = 0;
    let zoneName = "";
    if (!isPickup && parsed.data.deliveryZone) {
      const zone = STORE_CONSTANTS.DELIVERY_ZONES.find(
        (z) => z.id === parsed.data.deliveryZone
      );
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
          orderItemsPayload.map((i) => ({
            menuItemId: i.menuItemId ?? "",
            subtotal: i.subtotal,
          }))
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
        trackingToken,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        orderType: parsed.data.orderType,
        deliveryAddress: fullAddress,
        deliveryNotes: parsed.data.deliveryNotes ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: "unpaid",
        status: "pending",
        subtotal: calculatedSubtotal,
        deliveryFee,
        discountAmount,
        couponCode: validCouponCode,
        totalAmount,
        idempotencyKey,
      });

      await tx.insert(orderItems).values(
        orderItemsPayload.map((payload) => ({
          ...payload,
          orderId,
          // Deal items have no catalogued menuItemId row
          menuItemId: payload.itemName.startsWith("[DEAL]")
            ? null
            : payload.menuItemId,
        }))
      );
    });

    // 8. Increment coupon usage count
    if (validCouponCode) {
      await incrementCouponUsage(validCouponCode);
    }

    revalidatePath("/admin/orders");

    return { success: true, orderId, trackingToken };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; cause?: { code?: string } };
    const isDuplicate =
      err.code === "23505" ||
      err.message?.includes("duplicate key") ||
      err.cause?.code === "23505";

    if (isDuplicate) {
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.idempotencyKey, idempotencyKey),
      });
      if (existingOrder) {
        return {
          success: true,
          orderId: existingOrder.id,
          trackingToken: existingOrder.trackingToken,
          isDuplicate: true,
        };
      }
    }

    console.error("Checkout submission error:", error);
    return { success: false, error: "Failed to process order. Please try again." };
  }
}

