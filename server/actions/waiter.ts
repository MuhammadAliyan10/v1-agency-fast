"use server";

import { db } from "@/database/db";
import { orders, restaurantTables } from "@/database/schema";
import { requireWaiter } from "@/lib/auth/session";
import { eq, and, desc, inArray } from "drizzle-orm";

export type WaiterOrder = {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  totalAmount: number;
  discountAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  tableId: string | null;
  tableNumber: string | null;
  createdAt: Date | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    variantName: string | null;
    status: string;
    roundNumber: number;
  }[];
};

export type WaiterTableStatus = {
  id: string;
  name: string;
  capacity: number;
  hallType: "general" | "family";
  isOccupied: boolean;
  activeOrders: WaiterOrder[];
};

export async function getWaiterFloorData(): Promise<{
  success: boolean;
  data?: WaiterTableStatus[];
  error?: string;
}> {
  await requireWaiter();
  try {
    const [tables, activeOrders] = await Promise.all([
      db.select().from(restaurantTables).where(eq(restaurantTables.isActive, true)),
      db.query.orders.findMany({
        where: and(
          eq(orders.orderType, "dine_in"),
          inArray(orders.status, ["pending", "approved", "preparing", "ready_for_pickup"])
        ),
        with: { items: true },
        orderBy: [desc(orders.createdAt)],
      }),
    ]);

    const floorData: WaiterTableStatus[] = tables
      .map(table => {
        const tableOrders = activeOrders.filter(
          o => o.tableId === table.id || (o.tableNumber === table.name && !o.tableId)
        );
        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          hallType: table.hallType,
          isOccupied: tableOrders.length > 0,
          activeOrders: tableOrders.map(o => ({
            id: o.id,
            status: o.status,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            totalAmount: o.totalAmount,
            discountAmount: o.discountAmount,
            paymentStatus: o.paymentStatus,
            paymentMethod: o.paymentMethod,
            tableId: o.tableId,
            tableNumber: o.tableNumber,
            createdAt: o.createdAt,
            items: (o.items || []).map(i => ({
              id: i.id,
              itemName: i.itemName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
              variantName: i.variantName ?? null,
              status: i.status,
              roundNumber: i.roundNumber,
            })),
          })),
        };
      })
      .sort((a, b) => {
        if (a.hallType !== b.hallType) return a.hallType === "general" ? -1 : 1;
        const aNum = parseInt(a.name.match(/\d+/)?.[0] ?? "0");
        const bNum = parseInt(b.name.match(/\d+/)?.[0] ?? "0");
        return aNum - bNum;
      });

    return { success: true, data: floorData };
  } catch (error) {
    console.error("Failed to fetch waiter floor data:", error);
    return { success: false, error: "Failed to load floor data" };
  }
}

// Keep old export for any existing callers
export async function getWaiterActiveOrders() {
  return getWaiterFloorData();
}
