"use server";

import { db } from "@/database/db";
import { orders, orderItems } from "@/database/schema";
import { eq, inArray, asc, and } from "drizzle-orm";
import { requireKitchen } from "@/lib/auth/session";

export type KitchenOrder = {
  id: string;
  orderType: string;
  tableNumber: string | null;
  customerName: string;
  createdAt: Date | null;
  status: string;
  items: {
    id: string;
    itemName: string;
    variantName: string | null;
    quantity: number;
    status: string;
    specialInstructions: string | null;
    selectedAddOns: any | null;
  }[];
};

export async function getKitchenOrders(): Promise<{ success: true; data: KitchenOrder[] } | { success: false; error: string }> {
  await requireKitchen();
  try {
    // Fetch orders that are approved or preparing
    const activeOrders = await db.query.orders.findMany({
      where: inArray(orders.status, ["approved", "preparing"]),
      orderBy: [asc(orders.createdAt)],
      with: {
        items: true,
      }
    });

    const data: KitchenOrder[] = activeOrders.map(o => ({
      id: o.id,
      orderType: o.orderType,
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      createdAt: o.createdAt,
      status: o.status,
      items: o.items.map(i => ({
        id: i.id,
        itemName: i.itemName,
        variantName: i.variantName,
        quantity: i.quantity,
        status: i.status,
        specialInstructions: i.specialInstructions,
        selectedAddOns: i.selectedAddOns,
      }))
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch kitchen orders:", error);
    return { success: false, error: "Failed to fetch kitchen orders" };
  }
}

export async function updateKitchenItemStatus(itemId: string, newStatus: "pending" | "preparing" | "served") {
  await requireKitchen();
  try {
    await db.update(orderItems)
      .set({ status: newStatus })
      .where(eq(orderItems.id, itemId));
    
    // Check if all items in the order are served, and auto-update order status
    const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) });
    if (item && newStatus === "served") {
      const allItems = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, item.orderId) });
      const allServed = allItems.every(i => i.status === "served");
      if (allServed) {
        await db.update(orders)
          .set({ status: "ready_for_pickup", updatedAt: new Date() })
          .where(eq(orders.id, item.orderId));
      } else {
        await db.update(orders)
          .set({ status: "preparing", updatedAt: new Date() })
          .where(eq(orders.id, item.orderId));
      }
    } else if (item && newStatus === "preparing") {
      await db.update(orders)
        .set({ status: "preparing", updatedAt: new Date() })
        .where(eq(orders.id, item.orderId));
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update item status:", error);
    return { success: false, error: "Failed to update item status" };
  }
}

export async function bumpOrderItems(orderId: string) {
  await requireKitchen();
  try {
    // 1. Mark all pending/preparing items for this order as served
    await db.update(orderItems)
      .set({ status: "served" })
      .where(
        and(
          inArray(orderItems.status, ["pending", "preparing"]),
          eq(orderItems.orderId, orderId)
        )
      );
    
    // 2. Check if ALL items in the order are now served
    const allItems = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });
    const allServed = allItems.every(i => i.status === "served");
    
    // 3. If all items are served, we hand off the order (change status to ready_for_pickup)
    if (allServed) {
      await db.update(orders)
        .set({ status: "ready_for_pickup", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
    
    return { success: true };
  } catch (error) {
    console.error("Failed to bump order:", error);
    return { success: false, error: "Failed to bump order" };
  }
}
