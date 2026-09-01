"use server";

import { db } from "@/database/db";
import { orders, orderItems, users, menuItems, itemVariants } from "@/database/schema";
import { inArray, notInArray, eq, asc, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { STORE_CONSTANTS } from "@/lib/constants";
import { randomBytes } from "crypto";

export type OrderStatus =
  | "pending"
  | "approved"
  | "preparing"
  | "ready_for_pickup"
  | "delayed"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export async function getLiveOrders() {
  await requireAdmin();
  noStore();
  try {
    const ridersAlias = alias(users, "ridersAlias");

    const liveOrdersData = await db
      .select({
        order: orders,
        customer: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        },
        rider: {
          id: ridersAlias.id,
          name: ridersAlias.name,
          phone: ridersAlias.phone,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(ridersAlias, eq(orders.riderId, ridersAlias.id))
      .where(notInArray(orders.status, ["delivered", "cancelled", "rejected"]))
      .orderBy(desc(orders.createdAt));

    const liveOrderIds = liveOrdersData.map((o) => o.order.id);

    if (liveOrderIds.length === 0) {
      return { success: true, data: [] };
    }

    const itemsData = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, liveOrderIds));

    const formattedOrders = liveOrdersData.map(({ order, customer, rider }) => {
      const items = itemsData.filter((i) => i.orderId === order.id);
      return {
        ...order,
        customerName: order.customerName || customer?.name || "Guest",
        customerPhone: order.customerPhone || customer?.phone || "N/A",
        rider: rider?.id ? { name: rider.name, phone: rider.phone } : null,
        items,
      };
    });

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching live orders:", error);
    return { success: false, error: "Failed to fetch live orders" };
  }
}

export async function updateLiveOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  etaMinutes?: number
) {
  await requireAdmin();
  try {
    const updatePayload: Partial<typeof orders.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (etaMinutes && etaMinutes > 0) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + etaMinutes);
      updatePayload.estimatedReadyAt = eta;
    }

    await db.update(orders).set(updatePayload).where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export async function markOrderPaid(orderId: string) {
  await requireAdmin();
  try {
    await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId));
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error marking order paid:", error);
    return { success: false, error: "Failed to mark order as paid" };
  }
}

export async function getAvailableRiders() {
  await requireAdmin();
  try {
    const riders = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
      })
      .from(users)
      .where(and(eq(users.role, "rider"), eq(users.isActive, true)))
      .orderBy(asc(users.name));
    return { success: true, data: riders };
  } catch (error) {
    console.error("Error fetching available riders:", error);
    return { success: false, error: "Failed to fetch available riders" };
  }
}

export async function assignRiderToOrder(orderId: string, riderId: string) {
  await requireAdmin();
  try {
    // Fetch rider phone for WhatsApp link generation
    const rider = await db.query.users.findFirst({
      where: eq(users.id, riderId),
    });

    await db
      .update(orders)
      .set({ riderId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");

    // Return rider phone so UI can open WhatsApp link
    return { success: true, riderPhone: rider?.phone ?? null, riderName: rider?.name ?? null };
  } catch (error) {
    console.error("Error assigning rider to order:", error);
    return { success: false, error: "Failed to assign rider" };
  }
}

export async function createManualOrder(data: {
  customerName: string;
  customerPhone: string;
  orderType: "delivery" | "pickup";
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod: "COD" | "JazzCash" | "EasyPaisa";
  items: {
    menuItemId: string;
    variantId?: string;
    itemName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    specialInstructions?: string;
  }[];
}) {
  await requireAdmin();
  try {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "Order must have at least one item" };
    }

    const subtotal = data.items.reduce((sum, i) => sum + i.subtotal, 0);
    const deliveryFee = data.orderType === "pickup" ? 0 : STORE_CONSTANTS.DELIVERY_FEE;
    const totalAmount = subtotal + deliveryFee;

    const entropy = randomBytes(2).toString("hex").toUpperCase();
    const timestampStr = Date.now().toString().slice(-4);
    const orderId = `CC-${timestampStr}${entropy}`;

    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        orderType: data.orderType,
        deliveryAddress: data.orderType === "pickup" ? null : (data.deliveryAddress || null),
        deliveryNotes: data.deliveryNotes || null,
        paymentMethod: data.paymentMethod,
        paymentStatus: "unpaid",
        status: "pending",
        subtotal,
        deliveryFee,
        discountAmount: 0,
        totalAmount,
      });
      await tx.insert(orderItems).values(
        data.items.map((item) => ({
          orderId,
          menuItemId: item.menuItemId,
          variantId: item.variantId || null,
          itemName: item.itemName,
          variantName: item.variantName || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          selectedAddOns: null,
          specialInstructions: item.specialInstructions || null,
        }))
      );
    });

    revalidatePath("/admin/orders");
    return { success: true, orderId };
  } catch (error) {
    console.error("Error creating manual order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

/** Returns menu items with variants for manual order entry */
export async function getMenuForManualOrder() {
  await requireAdmin();
  try {
    const items = await db.query.menuItems.findMany({
      where: eq(menuItems.isAvailable, true),
      with: {
        category: true,
        variants: true,
      },
      orderBy: [asc(menuItems.name)],
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching menu for manual order:", error);
    return { success: false, error: "Failed to fetch menu" };
  }
}
