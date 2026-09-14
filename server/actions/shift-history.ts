"use server";

import { db } from "@/database/db";
import { orders, registerShifts, users } from "@/database/schema";
import { requireAdmin, requireManagerPermission } from "@/lib/auth/session";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function getShiftDetails(shiftId: string) {
  await requireManagerPermission("finance", "read");

  try {
    const openedByAlias = alias(users, "openedByAlias");
    const closedByAlias = alias(users, "closedByAlias");

    const shiftRows = await db
      .select({
        id: registerShifts.id,
        openedAt: registerShifts.openedAt,
        closedAt: registerShifts.closedAt,
        startingFloat: registerShifts.startingFloat,
        expectedCash: registerShifts.expectedCash,
        actualCash: registerShifts.actualCash,
        variance: registerShifts.variance,
        status: registerShifts.status,
        notes: registerShifts.notes,
        openedByName: openedByAlias.name,
        closedByName: closedByAlias.name,
      })
      .from(registerShifts)
      .leftJoin(openedByAlias, eq(openedByAlias.id, registerShifts.openedById))
      .leftJoin(closedByAlias, eq(closedByAlias.id, registerShifts.closedById))
      .where(eq(registerShifts.id, shiftId));

    if (shiftRows.length === 0) {
      return { success: false, error: "Shift not found" };
    }

    const shift = shiftRows[0];
    const upperBound = shift.closedAt || new Date();

    const ridersAlias = alias(users, "ridersAlias");
    const waitersAlias = alias(users, "waitersAlias");

    const boundedOrders = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        orderType: orders.orderType,
        createdAt: orders.createdAt,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        riderId: orders.riderId,
        waiterId: orders.waiterId,
        riderName: ridersAlias.name,
        waiterName: waitersAlias.name,
      })
      .from(orders)
      .leftJoin(ridersAlias, eq(orders.riderId, ridersAlias.id))
      .leftJoin(waitersAlias, eq(orders.waiterId, waitersAlias.id))
      .where(
        and(
          gte(orders.createdAt, shift.openedAt),
          lte(orders.createdAt, upperBound)
        )
      )
      .orderBy(desc(orders.createdAt));

    let totalGross = 0;
    let cashCollected = 0;
    let digitalCollected = 0;
    let cashWithRiders = 0;
    let cashWithWaiters = 0;
    let unpaidCredit = 0;
    
    const unpaidRidersMap = new Map<string, { name: string, amount: number, orders: string[] }>();
    const unpaidWaitersMap = new Map<string, { name: string, amount: number, orders: string[] }>();

    for (const o of boundedOrders) {
      if (["cancelled", "rejected"].includes(o.status)) continue;
      
      totalGross += o.totalAmount;
      
      if (o.paymentStatus === "paid") {
        if (o.paymentMethod === "Cash" || o.paymentMethod === "COD") {
          cashCollected += o.totalAmount;
        } else {
          digitalCollected += o.totalAmount;
        }
      } else {
        // Unpaid logic
        if ((o.paymentMethod === "Cash" || o.paymentMethod === "COD") && o.orderType === "delivery" && o.riderId) {
          cashWithRiders += o.totalAmount;
          const current = unpaidRidersMap.get(o.riderId) || { name: o.riderName || "Unknown", amount: 0, orders: [] };
          current.amount += o.totalAmount;
          current.orders.push(o.id.slice(-6).toUpperCase());
          unpaidRidersMap.set(o.riderId, current);
        } else if ((o.paymentMethod === "Cash" || o.paymentMethod === "COD") && ["dine_in", "pickup"].includes(o.orderType) && o.waiterId) {
          cashWithWaiters += o.totalAmount;
          const current = unpaidWaitersMap.get(o.waiterId) || { name: o.waiterName || "Unknown", amount: 0, orders: [] };
          current.amount += o.totalAmount;
          current.orders.push(o.id.slice(-6).toUpperCase());
          unpaidWaitersMap.set(o.waiterId, current);
        } else {
          unpaidCredit += o.totalAmount;
        }
      }
    }

    return {
      success: true,
      data: {
        shift,
        aggregates: {
          totalGross,
          cashCollected,
          digitalCollected,
          cashWithRiders,
          cashWithWaiters,
          unpaidCredit,
        },
        unpaidDetails: {
          riders: Array.from(unpaidRidersMap.values()),
          waiters: Array.from(unpaidWaitersMap.values()),
        },
        orders: boundedOrders,
      }
    };
  } catch (error) {
    console.error("Failed to fetch shift details:", error);
    return { success: false, error: "Internal server error" };
  }
}
