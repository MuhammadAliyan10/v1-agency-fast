"use server";

import { db } from "@/database/db";
import { registerShifts, orders } from "@/database/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requireAdmin, requireManagerPermission } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getCurrentShift() {
  const session = await requireManagerPermission("orders", "update");
  
  const activeShift = await db.query.registerShifts.findFirst({
    where: eq(registerShifts.status, "open"),
    orderBy: [desc(registerShifts.openedAt)],
    with: {
      openedBy: {
        columns: { name: true }
      }
    }
  });

  if (!activeShift) {
    return { success: true, data: null };
  }

  // Calculate current expected cash (starting float + all COD/Cash orders since openedAt)
  const shiftOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.paymentMethod, "Cash"),
      eq(orders.paymentStatus, "paid"),
      sql`${orders.createdAt} >= ${activeShift.openedAt}`
    ),
    columns: {
      totalAmount: true
    }
  });

  const cashSales = shiftOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const expectedCash = activeShift.startingFloat + cashSales;

  return { 
    success: true, 
    data: { 
      ...activeShift, 
      expectedCash,
      cashSales
    } 
  };
}

export async function openShift(startingFloat: number) {
  const session = await requireManagerPermission("orders", "update");

  try {
    const existing = await db.query.registerShifts.findFirst({
      where: eq(registerShifts.status, "open")
    });

    if (existing) {
      throw new Error("A shift is already open. Close it first.");
    }

    const [newShift] = await db.insert(registerShifts).values({
      openedById: session.id,
      startingFloat: startingFloat,
      expectedCash: startingFloat, // Will update dynamically or at close
      status: "open"
    }).returning();

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/finance");
    return { success: true, data: newShift };
  } catch (error: any) {
    console.error("Error opening shift:", error);
    return { success: false, error: error.message || "Failed to open shift" };
  }
}

export async function closeShift(shiftId: string, actualCash: number, notes?: string) {
  const session = await requireManagerPermission("orders", "update");

  try {
    const shift = await db.query.registerShifts.findFirst({
      where: eq(registerShifts.id, shiftId)
    });

    if (!shift || shift.status === "closed") {
      throw new Error("Shift not found or already closed");
    }

    // Calculate final expected cash
    const shiftOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.paymentMethod, "Cash"),
        eq(orders.paymentStatus, "paid"),
        sql`${orders.createdAt} >= ${shift.openedAt}`
      ),
      columns: {
        totalAmount: true
      }
    });

    const cashSales = shiftOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const expectedCash = shift.startingFloat + cashSales;
    const variance = actualCash - expectedCash;

    const [closedShift] = await db.update(registerShifts)
      .set({
        closedById: session.id,
        closedAt: new Date(),
        actualCash,
        expectedCash,
        variance,
        notes: notes || null,
        status: "closed"
      })
      .where(eq(registerShifts.id, shiftId))
      .returning();

    // Fetch Void & Waste stats during this shift for Z-Report
    const voidOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, "cancelled"),
        sql`${orders.createdAt} >= ${shift.openedAt}`
      ),
      columns: {
        id: true,
        totalAmount: true,
        voidReason: true,
        isWaste: true
      }
    });

    const totalVoidAmount = voidOrders.filter(o => !o.isWaste).reduce((sum, o) => sum + o.totalAmount, 0);
    const totalWasteAmount = voidOrders.filter(o => o.isWaste).reduce((sum, o) => sum + o.totalAmount, 0);

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/finance");

    return { 
      success: true, 
      data: {
        ...closedShift,
        cashSales,
        totalVoidAmount,
        totalWasteAmount,
        voidCount: voidOrders.length
      } 
    };
  } catch (error: any) {
    console.error("Error closing shift:", error);
    return { success: false, error: error.message || "Failed to close shift" };
  }
}
