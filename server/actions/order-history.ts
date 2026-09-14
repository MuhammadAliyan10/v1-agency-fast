"use server";

import { db } from "@/database/db";
import { orders, users, registerShifts, orderItems } from "@/database/schema";
import { requireAdmin } from "@/lib/auth/session";
import { desc, eq, or, ilike, sql, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface GetOrderHistoryParams {
  page?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getOrderHistory({ page = 1, search = "", status = "all", dateFrom, dateTo }: GetOrderHistoryParams = {}) {
  await requireAdmin();

  try {
    const limit = 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(orders.status, status as any));
    }

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, endOfDay));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(orders.id, searchPattern),
          ilike(orders.customerName, searchPattern),
          ilike(orders.customerPhone, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const { alias } = await import("drizzle-orm/pg-core");
    const creatorAlias = alias(users, "creatorAlias");
    const [data, totalCountResult] = await Promise.all([
      db.select({
        id: orders.id,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        orderType: orders.orderType,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        source: orders.source,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        discountAmount: orders.discountAmount,
        totalAmount: orders.totalAmount,
        tableId: orders.tableId,
        tableNumber: orders.tableNumber,
        deliveryAddress: orders.deliveryAddress,
        deliveryNotes: orders.deliveryNotes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        riderId: orders.riderId,
        waiterId: orders.waiterId,
        waiterName: orders.waiterName,
        voidReason: orders.voidReason,
        rejectionReason: orders.rejectionReason,
        delayReason: orders.delayReason,
        createdById: orders.createdById,
        creatorRole: creatorAlias.role,
        creatorName: creatorAlias.name,
      })
        .from(orders)
        .leftJoin(creatorAlias, eq(orders.createdById, creatorAlias.id))
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(whereClause),
    ]);

    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Failed to fetch order history:", error);
    return { success: false, error: "Failed to fetch order history." };
  }
}

export async function getOrderDetails(orderId: string) {
  await requireAdmin();

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        rider: {
          columns: { name: true }
        },
        waiter: {
          columns: { name: true }
        }
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: order };
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    return { success: false, error: "Failed to fetch order details." };
  }
}

export async function markOrderPaidFromHistory(orderId: string) {
  await requireAdmin();
  try {
    const activeShift = await db.query.registerShifts.findFirst({
      where: eq(registerShifts.status, "open"),
    });

    if (!activeShift) {
      return { success: false, error: "Cannot mark order as paid. No active register shift is open." };
    }

    const result = await db
      .update(orders)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!result.length) return { success: false, error: "Order not found" };

    revalidatePath("/admin/orders/history");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark order paid:", error);
    return { success: false, error: "Failed to mark order as paid" };
  }
}
