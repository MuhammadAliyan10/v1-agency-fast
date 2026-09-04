// server/actions/finance.ts
"use server";

import { db } from "@/database/db";
import { orders, orderItems, users } from "@/database/schema";
import { and, gte, lte, eq, sql, desc, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
  riderId: string | null;
  riderName: string | null;
  waiterId: string | null;
  waiterName: string | null;
}

// ── New: Register Close / Cash Collection ─────────────────────────────────────

/** Cash held by a single rider that has not been collected yet */
export interface RiderCashEntry {
  riderId: string;
  riderName: string;
  orderCount: number;
  totalCash: number;
  orders: { id: string; customerName: string; totalAmount: number; paymentMethod: string }[];
}

/** Cash taken at counter by a waiter that has not been reconciled yet */
export interface WaiterCashEntry {
  waiterId: string;
  waiterName: string;
  orderCount: number;
  totalCash: number;
  orders: { id: string; customerName: string; totalAmount: number; orderType: string }[];
}

/** Per-method breakdown of paid sales */
export interface PaymentMethodTotal {
  method: string;
  paid: number;
  unpaid: number;
  total: number;
  orderCount: number;
}

/** Everything the register-close view needs */
export interface RegisterCloseData {
  /** Total cash that should be in-store (paid Cash + paid COD collected at counter) */
  totalCashPaid: number;
  /** Total digital payments confirmed paid (JazzCash, EasyPaisa, Card, Bank) */
  totalDigitalPaid: number;
  /** Cash currently out with riders (COD paid status = collected_by_rider OR unpaid delivery) */
  cashWithRiders: number;
  /** Cash taken by waiters at counter (dine-in / pickup, paid = Cash) */
  cashWithWaiters: number;
  /** Per-method totals for the "What came in?" breakdown */
  paymentMethodTotals: PaymentMethodTotal[];
  /** Per-rider breakdown for COD orders */
  riderCash: RiderCashEntry[];
  /** Per-waiter breakdown for counter cash */
  waiterCash: WaiterCashEntry[];
  /** Unpaid (credit) orders — will pay later */
  unpaidCreditOrders: UnpaidOrder[];
  /** Sum of all unpaid credit orders */
  totalUnpaidCredit: number;
  /** Total of everything that is paid across all methods */
  totalPaidSales: number;
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
  registerClose: RegisterCloseData;
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
    // Uses EXTRACT(ISODOW …) — locale-independent ISO day-of-week (1=Mon … 7=Sun)
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd   = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart    = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd      = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const [currentWeekRows, lastWeekRows] = await Promise.all([
      db.select({
        dow:     sql<number>`EXTRACT(ISODOW FROM ${orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(gte(orders.createdAt, currentWeekStart), lte(orders.createdAt, currentWeekEnd), inArray(orders.status, [...ACTIVE_STATUSES])))
        .groupBy(sql`EXTRACT(ISODOW FROM ${orders.createdAt})`)
        .orderBy(sql`EXTRACT(ISODOW FROM ${orders.createdAt})`),
      db.select({
        dow:     sql<number>`EXTRACT(ISODOW FROM ${orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(gte(orders.createdAt, lastWeekStart), lte(orders.createdAt, lastWeekEnd), inArray(orders.status, [...ACTIVE_STATUSES])))
        .groupBy(sql`EXTRACT(ISODOW FROM ${orders.createdAt})`)
        .orderBy(sql`EXTRACT(ISODOW FROM ${orders.createdAt})`),
    ]);

    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    // ISODOW: 1=Mon … 7=Sun → index = dow - 1
    const currentMap = new Map(currentWeekRows.map(r => [Number(r.dow), Number(r.revenue)]));
    const lastMap    = new Map(lastWeekRows.map(r => [Number(r.dow), Number(r.revenue)]));
    const weekComparison: WeekComparison[] = DAY_LABELS.map((day, i) => ({
      day,
      currentWeek: currentMap.get(i + 1) ?? 0,
      lastWeek:    lastMap.get(i + 1)    ?? 0,
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
    const ridersAlias  = alias(users, "ridersAlias");
    const waitersAlias = alias(users, "waitersAlias");

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
        riderId:       orders.riderId,
        riderName:     ridersAlias.name,
        waiterId:      orders.waiterId,
        waiterName:    waitersAlias.name,
      })
      .from(orders)
      .leftJoin(ridersAlias,  eq(orders.riderId,  ridersAlias.id))
      .leftJoin(waitersAlias, eq(orders.waiterId, waitersAlias.id))
      .where(and(eq(orders.paymentStatus, "unpaid"), inArray(orders.status, [...ACTIVE_STATUSES])))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    // ── Register Close data ────────────────────────────────────────────────────
    // "Today" for register purposes = the active date range (defaults to today)
    const CASH_METHODS = ["Cash", "COD"] as const;
    const DIGITAL_METHODS = ["JazzCash", "EasyPaisa", "Card", "Bank"] as const;

    // All PAID orders in range — grouped by payment method for the cash register
    const paidBreakdownRows = await db
      .select({
        method:     orders.paymentMethod,
        orderCount: sql<number>`COUNT(${orders.id})`,
        total:      sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(and(activeCondition, eq(orders.paymentStatus, "paid")))
      .groupBy(orders.paymentMethod);

    const unpaidBreakdownRows = await db
      .select({
        method:     orders.paymentMethod,
        orderCount: sql<number>`COUNT(${orders.id})`,
        total:      sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(and(activeCondition, eq(orders.paymentStatus, "unpaid")))
      .groupBy(orders.paymentMethod);

    const unpaidMap = new Map(unpaidBreakdownRows.map(r => [String(r.method), { total: Number(r.total), count: Number(r.orderCount) }]));
    const paymentMethodTotals: PaymentMethodTotal[] = paidBreakdownRows.map(r => ({
      method:     String(r.method),
      paid:       Number(r.total),
      unpaid:     unpaidMap.get(String(r.method))?.total ?? 0,
      total:      Number(r.total) + (unpaidMap.get(String(r.method))?.total ?? 0),
      orderCount: Number(r.orderCount) + (unpaidMap.get(String(r.method))?.count ?? 0),
    }));
    // Add unpaid-only methods (methods with no paid orders)
    for (const [method, data] of unpaidMap) {
      if (!paidBreakdownRows.find(r => String(r.method) === method)) {
        paymentMethodTotals.push({ method, paid: 0, unpaid: data.total, total: data.total, orderCount: data.count });
      }
    }

    const totalCashPaid = paymentMethodTotals
      .filter(r => (CASH_METHODS as readonly string[]).includes(r.method))
      .reduce((s, r) => s + r.paid, 0);

    const totalDigitalPaid = paymentMethodTotals
      .filter(r => (DIGITAL_METHODS as readonly string[]).includes(r.method))
      .reduce((s, r) => s + r.paid, 0);

    const totalPaidSales = paymentMethodTotals.reduce((s, r) => s + r.paid, 0);

    // Cash out with riders (COD delivery orders that are unpaid or collected_by_rider)
    const riderCashOrders = alias(users, "riderCashAlias");
    const riderCashRows = await db
      .select({
        riderId:      orders.riderId,
        riderName:    riderCashOrders.name,
        orderId:      orders.id,
        customerName: orders.customerName,
        totalAmount:  orders.totalAmount,
        paymentMethod: orders.paymentMethod,
      })
      .from(orders)
      .leftJoin(riderCashOrders, eq(orders.riderId, riderCashOrders.id))
      .where(and(
        activeCondition,
        isNotNull(orders.riderId),
        eq(orders.orderType, "delivery"),
        inArray(orders.paymentMethod, [...CASH_METHODS]),
        eq(orders.paymentStatus, "unpaid")          // rider has not handed cash in yet
      ))
      .orderBy(orders.riderId);

    // Group by rider
    const riderMap = new Map<string, RiderCashEntry>();
    for (const row of riderCashRows) {
      if (!row.riderId) continue;
      const existing = riderMap.get(row.riderId);
      const orderEntry = { id: row.orderId, customerName: row.customerName, totalAmount: row.totalAmount, paymentMethod: row.paymentMethod };
      if (existing) {
        existing.totalCash += row.totalAmount;
        existing.orderCount += 1;
        existing.orders.push(orderEntry);
      } else {
        riderMap.set(row.riderId, {
          riderId: row.riderId,
          riderName: row.riderName ?? "Unknown Rider",
          orderCount: 1,
          totalCash: row.totalAmount,
          orders: [orderEntry],
        });
      }
    }
    const riderCash = [...riderMap.values()];
    const cashWithRiders = riderCash.reduce((s, r) => s + r.totalCash, 0);

    // Cash with waiters (dine-in/pickup Cash orders that are unpaid — counter not reconciled)
    const waiterCashOrders = alias(users, "waiterCashAlias");
    const waiterCashRows = await db
      .select({
        waiterId:     orders.waiterId,
        waiterName:   waiterCashOrders.name,
        orderId:      orders.id,
        customerName: orders.customerName,
        totalAmount:  orders.totalAmount,
        orderType:    orders.orderType,
      })
      .from(orders)
      .leftJoin(waiterCashOrders, eq(orders.waiterId, waiterCashOrders.id))
      .where(and(
        activeCondition,
        isNotNull(orders.waiterId),
        inArray(orders.orderType, ["dine_in", "pickup"]),
        inArray(orders.paymentMethod, [...CASH_METHODS]),
        eq(orders.paymentStatus, "unpaid")
      ))
      .orderBy(orders.waiterId);

    const waiterMap = new Map<string, WaiterCashEntry>();
    for (const row of waiterCashRows) {
      if (!row.waiterId) continue;
      const existing = waiterMap.get(row.waiterId);
      const orderEntry = { id: row.orderId, customerName: row.customerName, totalAmount: row.totalAmount, orderType: row.orderType };
      if (existing) {
        existing.totalCash += row.totalAmount;
        existing.orderCount += 1;
        existing.orders.push(orderEntry);
      } else {
        waiterMap.set(row.waiterId, {
          waiterId: row.waiterId,
          waiterName: row.waiterName ?? "Unknown Waiter",
          orderCount: 1,
          totalCash: row.totalAmount,
          orders: [orderEntry],
        });
      }
    }
    const waiterCash = [...waiterMap.values()];
    const cashWithWaiters = waiterCash.reduce((s, w) => s + w.totalCash, 0);

    // Credit (unpaid, non-cash) — customers who said "will pay tomorrow"
    const unpaidCreditOrders = (unpaidOrders as UnpaidOrder[]).filter(
      o => !( (CASH_METHODS as readonly string[]).includes(o.paymentMethod) )
        || o.orderType === "dine_in"   // dine-in COD tabs are credit
    );
    const totalUnpaidCredit = unpaidCreditOrders.reduce((s, o) => s + o.totalAmount, 0);

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
        registerClose: {
          totalCashPaid,
          totalDigitalPaid,
          cashWithRiders,
          cashWithWaiters,
          paymentMethodTotals,
          riderCash,
          waiterCash,
          unpaidCreditOrders,
          totalUnpaidCredit,
          totalPaidSales,
        },
      },
    };
  } catch (error) {
    console.error("Finance summary error:", error);
    return { success: false, error: "Failed to load financial summary" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone lean action for the Daily Register page.
// Only runs the 5 queries needed for cash reconciliation — no charts, no stats.
// ─────────────────────────────────────────────────────────────────────────────
export async function getRegisterCloseData(params: {
  from?: string;
  to?: string;
} = {}): Promise<{ success: true; data: RegisterCloseData } | { success: false; error: string }> {
  await requireManagerPermission("finance", "read");

  try {
    const now = new Date();
    // Default to today only (not whole month like getFinancialSummary)
    const fromDate = params.from ? startOfDay(new Date(params.from)) : startOfDay(now);
    const toDate   = params.to   ? endOfDay(new Date(params.to))     : endOfDay(now);

    const activeCondition = and(
      gte(orders.createdAt, fromDate),
      lte(orders.createdAt, toDate),
      inArray(orders.status, [...ACTIVE_STATUSES])
    );

    const CASH_METHODS    = ["Cash", "COD"]                          as const;
    const DIGITAL_METHODS = ["JazzCash", "EasyPaisa", "Card", "Bank"] as const;

    // ── Run all queries in parallel ──────────────────────────────────────────
    const ridersAlias       = alias(users, "ridersAlias");
    const waitersAlias      = alias(users, "waitersAlias");
    const riderCashAlias    = alias(users, "riderCashAlias2");
    const waiterCashAlias   = alias(users, "waiterCashAlias2");

    const [
      paidBreakdownRows,
      unpaidBreakdownRows,
      unpaidOrderRows,
      riderCashRows,
      waiterCashRows,
    ] = await Promise.all([
      // 1. Paid totals per payment method
      db.select({
        method:     orders.paymentMethod,
        orderCount: sql<number>`COUNT(${orders.id})`,
        total:      sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(activeCondition, eq(orders.paymentStatus, "paid")))
        .groupBy(orders.paymentMethod),

      // 2. Unpaid (credit) totals per payment method
      db.select({
        method:     orders.paymentMethod,
        orderCount: sql<number>`COUNT(${orders.id})`,
        total:      sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
        .from(orders)
        .where(and(activeCondition, eq(orders.paymentStatus, "unpaid")))
        .groupBy(orders.paymentMethod),

      // 3. All unpaid orders (with rider/waiter names) for credit list
      db.select({
        id:            orders.id,
        customerName:  orders.customerName,
        customerPhone: orders.customerPhone,
        totalAmount:   orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        orderType:     orders.orderType,
        createdAt:     orders.createdAt,
        status:        orders.status,
        riderId:       orders.riderId,
        riderName:     ridersAlias.name,
        waiterId:      orders.waiterId,
        waiterName:    waitersAlias.name,
      })
        .from(orders)
        .leftJoin(ridersAlias,  eq(orders.riderId,  ridersAlias.id))
        .leftJoin(waitersAlias, eq(orders.waiterId, waitersAlias.id))
        .where(and(activeCondition, eq(orders.paymentStatus, "unpaid")))
        .orderBy(desc(orders.createdAt))
        .limit(100),

      // 4. Cash out with riders (delivery COD not yet collected)
      db.select({
        riderId:       orders.riderId,
        riderName:     riderCashAlias.name,
        orderId:       orders.id,
        customerName:  orders.customerName,
        totalAmount:   orders.totalAmount,
        paymentMethod: orders.paymentMethod,
      })
        .from(orders)
        .leftJoin(riderCashAlias, eq(orders.riderId, riderCashAlias.id))
        .where(and(
          activeCondition,
          isNotNull(orders.riderId),
          eq(orders.orderType, "delivery"),
          inArray(orders.paymentMethod, [...CASH_METHODS]),
          eq(orders.paymentStatus, "unpaid")
        ))
        .orderBy(orders.riderId),

      // 5. Cash with waiters (dine-in/pickup cash not yet reconciled)
      db.select({
        waiterId:     orders.waiterId,
        waiterName:   waiterCashAlias.name,
        orderId:      orders.id,
        customerName: orders.customerName,
        totalAmount:  orders.totalAmount,
        orderType:    orders.orderType,
      })
        .from(orders)
        .leftJoin(waiterCashAlias, eq(orders.waiterId, waiterCashAlias.id))
        .where(and(
          activeCondition,
          isNotNull(orders.waiterId),
          inArray(orders.orderType, ["dine_in", "pickup"]),
          inArray(orders.paymentMethod, [...CASH_METHODS]),
          eq(orders.paymentStatus, "unpaid")
        ))
        .orderBy(orders.waiterId),
    ]);

    // ── Build payment method totals ─────────────────────────────────────────
    const unpaidMap = new Map(
      unpaidBreakdownRows.map(r => [String(r.method), { total: Number(r.total), count: Number(r.orderCount) }])
    );
    const paymentMethodTotals: PaymentMethodTotal[] = paidBreakdownRows.map(r => ({
      method:     String(r.method),
      paid:       Number(r.total),
      unpaid:     unpaidMap.get(String(r.method))?.total ?? 0,
      total:      Number(r.total) + (unpaidMap.get(String(r.method))?.total ?? 0),
      orderCount: Number(r.orderCount) + (unpaidMap.get(String(r.method))?.count ?? 0),
    }));
    // Include methods that only have unpaid orders
    for (const [method, d] of unpaidMap) {
      if (!paidBreakdownRows.find(r => String(r.method) === method)) {
        paymentMethodTotals.push({ method, paid: 0, unpaid: d.total, total: d.total, orderCount: d.count });
      }
    }

    const totalCashPaid = paymentMethodTotals
      .filter(r => (CASH_METHODS as readonly string[]).includes(r.method))
      .reduce((s, r) => s + r.paid, 0);

    const totalDigitalPaid = paymentMethodTotals
      .filter(r => (DIGITAL_METHODS as readonly string[]).includes(r.method))
      .reduce((s, r) => s + r.paid, 0);

    const totalPaidSales = paymentMethodTotals.reduce((s, r) => s + r.paid, 0);

    // ── Group rider cash ────────────────────────────────────────────────────
    const riderMap = new Map<string, RiderCashEntry>();
    for (const row of riderCashRows) {
      if (!row.riderId) continue;
      const entry = { id: row.orderId, customerName: row.customerName, totalAmount: row.totalAmount, paymentMethod: row.paymentMethod };
      const existing = riderMap.get(row.riderId);
      if (existing) {
        existing.totalCash += row.totalAmount;
        existing.orderCount += 1;
        existing.orders.push(entry);
      } else {
        riderMap.set(row.riderId, { riderId: row.riderId, riderName: row.riderName ?? "Unknown Rider", orderCount: 1, totalCash: row.totalAmount, orders: [entry] });
      }
    }
    const riderCash = [...riderMap.values()];
    const cashWithRiders = riderCash.reduce((s, r) => s + r.totalCash, 0);

    // ── Group waiter cash ───────────────────────────────────────────────────
    const waiterMap = new Map<string, WaiterCashEntry>();
    for (const row of waiterCashRows) {
      if (!row.waiterId) continue;
      const entry = { id: row.orderId, customerName: row.customerName, totalAmount: row.totalAmount, orderType: row.orderType };
      const existing = waiterMap.get(row.waiterId);
      if (existing) {
        existing.totalCash += row.totalAmount;
        existing.orderCount += 1;
        existing.orders.push(entry);
      } else {
        waiterMap.set(row.waiterId, { waiterId: row.waiterId, waiterName: row.waiterName ?? "Unknown Waiter", orderCount: 1, totalCash: row.totalAmount, orders: [entry] });
      }
    }
    const waiterCash = [...waiterMap.values()];
    const cashWithWaiters = waiterCash.reduce((s, w) => s + w.totalCash, 0);

    // ── Credit orders (will pay later) ──────────────────────────────────────
    const unpaidCreditOrders = (unpaidOrderRows as UnpaidOrder[]).filter(
      o => !(CASH_METHODS as readonly string[]).includes(o.paymentMethod) || o.orderType === "dine_in"
    );
    const totalUnpaidCredit = unpaidCreditOrders.reduce((s, o) => s + o.totalAmount, 0);

    return {
      success: true,
      data: {
        totalCashPaid,
        totalDigitalPaid,
        cashWithRiders,
        cashWithWaiters,
        paymentMethodTotals,
        riderCash,
        waiterCash,
        unpaidCreditOrders,
        totalUnpaidCredit,
        totalPaidSales,
      },
    };
  } catch (error) {
    console.error("Register close error:", error);
    return { success: false, error: "Failed to load register data" };
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
