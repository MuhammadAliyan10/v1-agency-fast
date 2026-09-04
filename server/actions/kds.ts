"use server";

import { db } from "@/database/db";
import { orders, orderItems } from "@/database/schema";
import { eq, inArray, asc, and } from "drizzle-orm";
import { requireKitchen } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KitchenOrderItem = {
  id: string;
  itemName: string;
  variantName: string | null;
  quantity: number;
  status: string;
  specialInstructions: string | null;
  selectedAddOns: unknown | null;
};

export type KitchenOrder = {
  id: string;
  orderType: string;
  tableNumber: string | null;
  customerName: string;
  createdAt: Date | null;
  status: string;
  items: KitchenOrderItem[];
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getKitchenOrders(): Promise<
  { success: true; data: KitchenOrder[] } | { success: false; error: string }
> {
  await requireKitchen();
  try {
    const activeOrders = await db.query.orders.findMany({
      where: inArray(orders.status, ["approved", "preparing"]),
      orderBy: [asc(orders.createdAt)],
      with: { items: true },
    });

    const data: KitchenOrder[] = activeOrders.map((o) => ({
      id: o.id,
      orderType: o.orderType,
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      createdAt: o.createdAt,
      status: o.status,
      items: o.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        variantName: i.variantName,
        quantity: i.quantity,
        status: i.status,
        specialInstructions: i.specialInstructions,
        selectedAddOns: i.selectedAddOns,
      })),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch kitchen orders:", error);
    return { success: false, error: "Failed to fetch kitchen orders" };
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Marks a single order item as pending | preparing | served.
 *
 * All reads and the subsequent order-status derivation happen inside a single
 * transaction so there is no window where the item is updated but the parent
 * order status is not.
 */
export async function updateKitchenItemStatus(
  itemId: string,
  newStatus: "pending" | "preparing" | "served"
): Promise<{ success: true } | { success: false; error: string }> {
  await requireKitchen();
  try {
    await db.transaction(async (tx) => {
      // 1. Update item status
      await tx
        .update(orderItems)
        .set({ status: newStatus })
        .where(eq(orderItems.id, itemId));

      // 2. Fetch the updated item (inside tx for read consistency)
      const item = await tx.query.orderItems.findFirst({
        where: eq(orderItems.id, itemId),
      });

      if (!item) {
        throw new Error(`Order item ${itemId} not found after update`);
      }

      // 3. Re-read ALL sibling items to derive the correct parent order status
      const allItems = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, item.orderId),
      });

      const allServed = allItems.length > 0 && allItems.every((i) => i.status === "served");
      const anyActive = allItems.some(
        (i) => i.status === "preparing" || i.status === "served"
      );

      const derivedOrderStatus =
        allServed ? "ready_for_pickup"
        : anyActive ? "preparing"
        : "approved";

      await tx
        .update(orders)
        .set({ status: derivedOrderStatus, updatedAt: new Date() })
        .where(eq(orders.id, item.orderId));
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update item status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item status",
    };
  }
}

/**
 * "Bumps" an order — marks every pending/preparing item as served and, if all
 * items are now served, transitions the order to ready_for_pickup.
 *
 * Wrapped in a transaction so the item UPDATE and the order UPDATE are
 * either both committed or both rolled back — no partially-bumped orders.
 */
export async function bumpOrderItems(
  orderId: string
): Promise<{ success: true } | { success: false; error: string }> {
  await requireKitchen();
  try {
    await db.transaction(async (tx) => {
      // 1. Mark all active items served atomically
      await tx
        .update(orderItems)
        .set({ status: "served" })
        .where(
          and(
            eq(orderItems.orderId, orderId),
            inArray(orderItems.status, ["pending", "preparing"])
          )
        );

      // 2. Re-read all items inside the same transaction to confirm state
      const allItems = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
      });

      if (allItems.length === 0) {
        throw new Error(`No items found for order ${orderId}`);
      }

      const allServed = allItems.every((i) => i.status === "served");

      if (allServed) {
        await tx
          .update(orders)
          .set({ status: "ready_for_pickup", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to bump order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bump order",
    };
  }
}
