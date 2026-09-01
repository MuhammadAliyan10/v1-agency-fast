"use server";

import { db } from "@/database/db";
import { orders, orderItems } from "@/database/schema";
import { requireWaiter } from "@/lib/auth/session";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function getWaiterActiveOrders() {
  const session = await requireWaiter();
  try {
    const data = await db.query.orders.findMany({
      where: and(
        // Waiters can see all active dine-in orders to support table management
        eq(orders.orderType, "dine_in"),
        inArray(orders.status, ["pending", "approved", "preparing", "ready_for_pickup"])
      ),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
    });
    
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch waiter orders:", error);
    return { success: false, error: "Failed to fetch active tables" };
  }
}
