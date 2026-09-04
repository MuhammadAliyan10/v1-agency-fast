"use server";

import { db } from "@/database/db";
import { restaurantTables, orders } from "@/database/schema";
import { eq, inArray, and } from "drizzle-orm";
import { requireAdmin, requireWaiter } from "@/lib/auth/session";

export type TableStatus = {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  hallType: "general" | "family";
  isOccupied: boolean;
  activeOrderIds: string[];
};

export async function getTablesWithStatus(): Promise<{ success: boolean; data?: TableStatus[]; error?: string }> {
  try {
    // Both Admins and Waiters can view tables
    const tables = await db.select().from(restaurantTables).where(eq(restaurantTables.isActive, true));
    
    // Get all active dine-in orders
    const activeOrders = await db.select().from(orders).where(
      and(
        eq(orders.orderType, "dine_in"),
        inArray(orders.status, ["pending", "approved", "preparing", "ready_for_pickup"])
      )
    );

    const tableStatuses: TableStatus[] = tables.map(table => {
      const ordersForTable = activeOrders.filter(o => o.tableId === table.id || (o.tableNumber === table.name && !o.tableId));
      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        isActive: table.isActive,
        hallType: table.hallType,
        isOccupied: ordersForTable.length > 0,
        activeOrderIds: ordersForTable.map(o => o.id),
      };
    });

    // Sort by name
    tableStatuses.sort((a, b) => {
       const aMatch = a.name.match(/\d+/);
       const bMatch = b.name.match(/\d+/);
       if (aMatch && bMatch) {
         return parseInt(aMatch[0]) - parseInt(bMatch[0]);
       }
       return a.name.localeCompare(b.name);
    });

    return { success: true, data: tableStatuses };
  } catch (error: any) {
    console.error("Failed to fetch tables:", error);
    return { success: false, error: error.message || "Failed to fetch tables" };
  }
}

export async function transferTable(orderId: string, newTableId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    
    const table = await db.query.restaurantTables.findFirst({
      where: eq(restaurantTables.id, newTableId)
    });
    
    if (!table) throw new Error("Target table not found");

    await db.update(orders)
      .set({ 
        tableId: newTableId, 
        tableNumber: table.name // keep legacy column in sync
      })
      .where(eq(orders.id, orderId));

    return { success: true };
  } catch (error: any) {
    console.error("Failed to transfer table:", error);
    return { success: false, error: error.message || "Failed to transfer table" };
  }
}

export async function seedTables(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const existing = await db.select().from(restaurantTables);
    if (existing.length > 0) return { success: true, error: "Tables already seeded" };

    const newTables = Array.from({ length: 8 }).map((_, i) => ({
      name: `Table ${i + 1}`,
      capacity: 4,
      isActive: true,
    }));

    await db.insert(restaurantTables).values(newTables);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to seed tables:", error);
    return { success: false, error: error.message || "Failed to seed tables" };
  }
}
