// server/actions/finance.ts
"use server";

import { db } from "@/database/db";
import { orders, orderItems } from "@/database/schema";
import { and, gte, lte, eq, sql, desc, inArray, notInArray } from "drizzle-orm";
import { requireManagerPermission } from "@/lib/auth/session";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export interface FinancialStats {
  grossSales: number;
  totalDiscounts: number;
  totalDeliveryFees: number;
  netRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  deliveryOrders: number;
  pickupOrders: number;
  dineInOrders: number;
  deliveryRevenue: number;
  pickupRevenue: number;
  dineInRevenue: number;
  unpaidAmount: number;
  paidAmount: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  discounts: number;
}

export interface WeekComparison {
  day: string;
  currentWeek: number;
  lastWeek: number;
}

export interface TopItem {
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentBreakdown {
  method: string;
  count: number;
  revenue: number;
}

export interface LostOrder {
  id: string;
  customerName: string;
  totalAmount: number;
  orderType: string;
  status: string;
  rejectionReason: string | null;
  delayReason: string | null;
  createdAt: Date | null;
}

export interface UnpaidOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod: string;
  orderType: string;
  createdAt: Date | null;
  status: string;
}

export interface FinancialSummaryResult {
  stats: FinancialStats;
  dailyRevenue: DailyRevenue[];
  weekComparison: WeekComparison[];
  topItems: TopItem[];
  paymentBreakdown: PaymentBreakdown[];
  unpaidOrders: UnpaidOrder[];
  lostOrders: LostOrder[];
  lostRevenue: number;
}

const ACTIVE_STATUSES = ["pending", "approved", "preparing", "ready_for_pickup", "out_for_delivery", "delivered"] as const;
const LOST_STATUSES = ["cancelled", "rejected"] as const;

export async function getFinancialSummary(params: {
  from?: string;
  to?: string;
} = {}): Promise<{ success: true; data: FinancialSummaryResult } | { success: false; error: string }> {
  await requireManagerPermission("finance", "read");

  try {
    const now = new Date();
    const fromDate = params.from
      ? startOfDay(new Date(params.from))
      : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const toDate = params.to ? endOfDay(new Date(params.to)) : endOfDay(now);

    const rangeCondition = and(
      gte(orders.createdAt, fromDate),
      lte(orders.createdAt, toDate)
    );

    const activeCondition = and(
      rangeCondition,
      inArray(orders.status, [...ACTIVE_STATUSES])
    );

    // ── Core KPI aggregations (DB does all math) ──────────────────────────────
    const [statsRow] = await db
      .select({
        grossSales:       sql<number>`COALESCE(SUM(${orders.subtotal}), 0)`,
        totalDiscounts:   sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`,
        totalDeliveryFees:sql<number>`COALESCE(SUM(${orders.deliveryFee}), 0)`,
        netRevenue:       sql<number>`COALESCE(SUM(${orders.subtotal} - ${orders.discountAmount}), 0)`,
        totalOrders:      sql<number>`COUNT(${orders.id})`,
        avgOrderValue:    sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)`,
        deliveryOrders:   sql<number>`COUNT(CASE WHEN ${orders.orderType} = 'delivery' THEN 1 END)`,
        pickupOrders:     sql<number>`COUNT(CASE WHEN ${orders.orderType} = 'pickup' THEN 1 END)`,
        dineInOrders:     sql<number>`COUNT(CASE WHEN ${orders.orderType} = 'dine_in' THEN 1 END)`,
        deliveryRevenue:  sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderType} = 'delivery' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
        pickupRevenue:    sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderType} = 'pickup' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
        dineInRevenue:    sql<number>`COALESCE(SUM(CASE WHEN ${orders.orderType} = 'dine_in' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
        unpaidAmount:     sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'unpaid' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
        paidAmount:       sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(activeCondition);

    // ── Lost revenue (cancelled + rejected in range) ───────────────────────────
    const [lostRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(and(rangeCondition, inArray(orders.status, [...LOST_STATUSES])));

    // ── Daily revenue for range ────────────────────────────────────────────────
    const dailyRevenue = await db
      .select({
        date:      sql<string>`DATE(${orders.createdAt})`,
        revenue:   sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        orders:    sql<number>`COUNT(${orders.id})`,
        discounts: sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`,
      })
      .from(orders)
      .where(activeCondition)
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // ── Week-over-week comparison (always current 7 days vs prior 7 days) ─────
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd   = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart    = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd      = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const [currentWeekRows, lastWeekRows] = await Promise.all([
      db.select({
        day:     sql<string>`TO_CHAR(${orders.createdAt}, 'Dy')`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(gte(orders.createdAt, currentWeekStart), lte(orders.createdAt, currentWeekEnd), inArray(orders.status, [...ACTIVE_STATUSES])))
        .groupBy(sql`TO_CHAR(${orders.createdAt}, 'Dy'), DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`),
      db.select({
        day:     sql<string>`TO_CHAR(${orders.createdAt}, 'Dy')`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(gte(orders.createdAt, lastWeekStart), lte(orders.createdAt, lastWeekEnd), inArray(orders.status, [...ACTIVE_STATUSES])))
        .groupBy(sql`TO_CHAR(${orders.createdAt}, 'Dy'), DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`),
    ]);

    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentMap = new Map(currentWeekRows.map(r => [r.day.trim(), Number(r.revenue)]));
    const lastMap    = new Map(lastWeekRows.map(r => [r.day.trim(), Number(r.revenue)]));
    const weekComparison: WeekComparison[] = DAY_LABELS.map(day => ({
      day,
      currentWeek: currentMap.get(day) ?? 0,
      lastWeek:    lastMap.get(day)    ?? 0,
    }));

    // ── Top selling items ──────────────────────────────────────────────────────
    const topItems = await db
      .select({
        itemName:      orderItems.itemName,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue:  sql<number>`SUM(${orderItems.subtotal})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(rangeCondition, inArray(orders.status, [...ACTIVE_STATUSES])))
      .groupBy(orderItems.itemName)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(8);

    // ── Payment method breakdown ───────────────────────────────────────────────
    const paymentBreakdown = await db
      .select({
        method:  orders.paymentMethod,
        count:   sql<number>`COUNT(${orders.id})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(activeCondition)
      .groupBy(orders.paymentMethod);

    // ── Unpaid orders ──────────────────────────────────────────────────────────
    const unpaidOrders = await db
      .select({
        id:            orders.id,
        customerName:  orders.customerName,
        customerPhone: orders.customerPhone,
        totalAmount:   orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        orderType:     orders.orderType,
        createdAt:     orders.createdAt,
        status:        orders.status,
      })
      .from(orders)
      .where(and(eq(orders.paymentStatus, "unpaid"), inArray(orders.status, [...ACTIVE_STATUSES])))
      .orderBy(desc(orders.createdAt))
      .limit(25);

    // ── Lost orders ────────────────────────────────────────────────────────────
    const lostOrders = await db
      .select({
        id:              orders.id,
        customerName:    orders.customerName,
        totalAmount:     orders.totalAmount,
        orderType:       orders.orderType,
        status:          orders.status,
        rejectionReason: orders.rejectionReason,
        delayReason:     orders.delayReason,
        createdAt:       orders.createdAt,
      })
      .from(orders)
      .where(and(rangeCondition, inArray(orders.status, [...LOST_STATUSES])))
      .orderBy(desc(orders.createdAt))
      .limit(25);

    return {
      success: true,
      data: {
        stats: {
          grossSales:        Number(statsRow.grossSales),
          totalDiscounts:    Number(statsRow.totalDiscounts),
          totalDeliveryFees: Number(statsRow.totalDeliveryFees),
          netRevenue:        Number(statsRow.netRevenue),
          totalOrders:       Number(statsRow.totalOrders),
          avgOrderValue:     Math.round(Number(statsRow.avgOrderValue)),
          deliveryOrders:    Number(statsRow.deliveryOrders),
          pickupOrders:      Number(statsRow.pickupOrders),
          dineInOrders:      Number(statsRow.dineInOrders),
          deliveryRevenue:   Number(statsRow.deliveryRevenue),
          pickupRevenue:     Number(statsRow.pickupRevenue),
          dineInRevenue:     Number(statsRow.dineInRevenue),
          unpaidAmount:      Number(statsRow.unpaidAmount),
          paidAmount:        Number(statsRow.paidAmount),
        },
        dailyRevenue: dailyRevenue.map(r => ({
          date:      String(r.date),
          revenue:   Number(r.revenue),
          orders:    Number(r.orders),
          discounts: Number(r.discounts),
        })),
        weekComparison,
        topItems: topItems.map(r => ({
          itemName:      String(r.itemName),
          totalQuantity: Number(r.totalQuantity),
          totalRevenue:  Number(r.totalRevenue),
        })),
        paymentBreakdown: paymentBreakdown.map(r => ({
          method:  String(r.method),
          count:   Number(r.count),
          revenue: Number(r.revenue),
        })),
        unpaidOrders:  unpaidOrders  as UnpaidOrder[],
        lostOrders:    lostOrders    as LostOrder[],
        lostRevenue:   Number(lostRow.total),
      },
    };
  } catch (error) {
    console.error("Finance summary error:", error);
    return { success: false, error: "Failed to load financial summary" };
  }
}

export async function markOrderPaid(orderId: string): Promise<{ success: boolean; error?: string }> {
  await requireManagerPermission("finance", "read");
  try {
    await db.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, orderId));
    return { success: true };
  } catch (error) {
    console.error("Mark paid error:", error);
    return { success: false, error: "Failed to mark order as paid" };
  }
}
