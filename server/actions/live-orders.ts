"use server";

import { db } from "@/database/db";
import { orders, orderItems, users } from "@/database/schema";
import { inArray, notInArray, eq, asc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";

export type OrderStatus = "pending" | "approved" | "preparing" | "delayed" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";

import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";

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
        }
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(ridersAlias, eq(orders.riderId, ridersAlias.id))
      .where(notInArray(orders.status, ["delivered", "cancelled", "rejected"]))
      .orderBy(asc(orders.createdAt));

    // Get order items for these orders
    const liveOrderIds = liveOrdersData.map(o => o.order.id);
    
    if (liveOrderIds.length === 0) {
      return { success: true, data: [] };
    }

    const itemsData = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, liveOrderIds));

    // Group items by order
    const formattedOrders = liveOrdersData.map(({ order, customer, rider }) => {
      const items = itemsData.filter(i => i.orderId === order.id);
      return {
        ...order,
        customerName: order.customerName || customer?.name || "Guest",
        customerPhone: order.customerPhone || customer?.phone || "N/A",
        rider: rider ? { name: rider.name, phone: rider.phone } : null,
        items,
      };
    });

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching live orders:", error);
    return { success: false, error: "Failed to fetch live orders" };
  }
}

export async function updateLiveOrderStatus(orderId: string, newStatus: OrderStatus) {
  await requireAdmin();
  try {
    await db
      .update(orders)
      .set({ 
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export async function getAvailableRiders() {
  await requireAdmin();
  try {
    const riders = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "rider"),
          eq(users.isActive, true)
        )
      )
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
    await db
      .update(orders)
      .set({ 
        riderId,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error assigning rider to order:", error);
    return { success: false, error: "Failed to assign rider" };
  }
}
