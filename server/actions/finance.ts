"use server";

import { db } from "@/database/db";
import { orders, orderItems } from "@/database/schema";
import { and, gte, lte, eq, sql, desc } from "drizzle-orm";

export async function getFinancialSummary(range: "today" | "week" | "month" | "all" = "month") {
  try {
    const now = new Date();
    let fromDate: Date | null = null;

    if (range === "today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
    } else if (range === "month") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 30);
    }

    const whereClause = fromDate
      ? and(
          gte(orders.createdAt, fromDate),
          sql`${orders.status} NOT IN ('cancelled', 'rejected')`
        )
      : sql`${orders.status} NOT IN ('cancelled', 'rejected')`;

    // Revenue and order stats
    const [stats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        totalOrders: sql<number>`COUNT(${orders.id})`,
        avgOrderValue: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)`,
        deliveryOrders: sql<number>`COUNT(CASE WHEN ${orders.orderType} = 'delivery' THEN 1 END)`,
        pickupOrders: sql<number>`COUNT(CASE WHEN ${orders.orderType} = 'pickup' THEN 1 END)`,
        totalDiscount: sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`,
        unpaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'unpaid' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(whereClause as any);

    // Payment method breakdown
    const paymentBreakdown = await db
      .select({
        method: orders.paymentMethod,
        count: sql<number>`COUNT(${orders.id})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(whereClause as any)
      .groupBy(orders.paymentMethod);

    // Daily revenue for chart (last 30 days)
    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        count: sql<number>`COUNT(${orders.id})`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
          sql`${orders.status} NOT IN ('cancelled', 'rejected')`
        ) as any
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Top selling items
    const topItems = await db
      .select({
        itemName: orderItems.itemName,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(${orderItems.subtotal})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        fromDate
          ? and(
              gte(orders.createdAt, fromDate),
              sql`${orders.status} NOT IN ('cancelled', 'rejected')`
            ) as any
          : (sql`${orders.status} NOT IN ('cancelled', 'rejected')` as any)
      )
      .groupBy(orderItems.itemName)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    // Unpaid orders list
    const unpaidOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.paymentStatus, "unpaid"),
        sql`${orders.status} NOT IN ('cancelled', 'rejected')` as any
      ),
      columns: {
        id: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        paymentMethod: true,
        orderType: true,
        createdAt: true,
        status: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit: 20,
    });

    return {
      success: true,
      data: {
        stats,
        paymentBreakdown,
        dailyRevenue,
        topItems,
        unpaidOrders,
      },
    };
  } catch (error) {
    console.error("Finance summary error:", error);
    return { success: false, error: "Failed to load financial summary" };
  }
}

export async function markOrderPaid(orderId: string) {
  try {
    await db
      .update(orders)
      .set({ paymentStatus: "paid" })
      .where(eq(orders.id, orderId));
    return { success: true };
  } catch (error) {
    console.error("Mark paid error:", error);
    return { success: false, error: "Failed to mark order as paid" };
  }
}
