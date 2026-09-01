"use server";

import { db } from "@/database/db";
import { orders } from "@/database/schema";
import { requireRider } from "@/lib/auth/session";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getRiderActiveOrders() {
  const session = await requireRider();
  try {
    const data = await db.query.orders.findMany({
      where: and(
        // Admins see all assigned orders, riders see only theirs
        session.role === "admin" ? undefined : eq(orders.riderId, session.id),
        eq(orders.orderType, "delivery"),
        inArray(orders.status, ["ready_for_pickup", "out_for_delivery"])
      ),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
    });
    
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch rider orders:", error);
    return { success: false, error: "Failed to fetch active deliveries" };
  }
}

export async function markOrderDelivered(orderId: string, paymentMethod: string) {
  const session = await requireRider();
  try {
    const existingOrderArr = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (existingOrderArr.length === 0) throw new Error("Order not found");
    const order = existingOrderArr[0];

    // Security Check: Only the assigned rider (or admin) can complete it
    if (session.role === "rider" && order.riderId !== session.id) {
      throw new Error("UNAUTHORIZED: You are not assigned to this order.");
    }

    const payload: any = {
      status: "delivered",
      updatedAt: new Date(),
    };

    if (paymentMethod === "COD") {
      payload.paymentStatus = "collected_by_rider";
    }

    await db.update(orders).set(payload).where(eq(orders.id, orderId));

    revalidatePath("/rider");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark order delivered:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark order as delivered" };
  }
}
