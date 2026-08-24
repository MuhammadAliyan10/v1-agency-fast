"use server";

import { db } from "@/database/db";
import { orders, orderItems, users } from "@/database/schema";
import { inArray, notInArray, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type OrderStatus = "pending" | "approved" | "preparing" | "delayed" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";

import { unstable_noStore as noStore } from "next/cache";

export async function getLiveOrders() {
  noStore();
  try {
    const liveOrdersData = await db
      .select({
        order: orders,
        customer: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        }
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
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
    const formattedOrders = liveOrdersData.map(({ order, customer }) => {
      const items = itemsData.filter(i => i.orderId === order.id);
      return {
        ...order,
        customerName: order.customerName || customer?.name || "Guest",
        customerPhone: order.customerPhone || customer?.phone || "N/A",
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
