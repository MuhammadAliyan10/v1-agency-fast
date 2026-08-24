import { db } from "@/database/db";
import { orders, orderItems, menuItems, categories, inventoryItems } from "@/database/schema";
import { eq, and, gte, lt, desc, sql, inArray, or, ne } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import type { 
  DashboardKPIs, 
  WeeklyRevenuePoint, 
  TopSellingItem, 
  RecentOrderSummary, 
  LowStockAlert 
} from "@/types/analytics";

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));

  // Today's Stats
  const todayStatsRaw = await db
    .select({
      revenue: sql<number>`sum(case when ${orders.status} != 'cancelled' then ${orders.totalAmount} else 0 end)::int`,
      count: sql<number>`count(${orders.id})::int`,
      pendingCount: sql<number>`sum(case when ${orders.status} in ('pending', 'approved') then 1 else 0 end)::int`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, todayStart),
        lt(orders.createdAt, todayEnd)
      )
    );

  // Yesterday's Stats for comparison
  const yesterdayStatsRaw = await db
    .select({
      revenue: sql<number>`sum(case when ${orders.status} != 'cancelled' then ${orders.totalAmount} else 0 end)::int`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, yesterdayStart),
        lt(orders.createdAt, yesterdayEnd)
      )
    );

  const todayRevenue = todayStatsRaw[0]?.revenue || 0;
  const yesterdayRevenue = yesterdayStatsRaw[0]?.revenue || 0;
  const todayOrdersCount = todayStatsRaw[0]?.count || 0;
  const pendingOrdersCount = todayStatsRaw[0]?.pendingCount || 0;

  const averageOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;
  
  let revenueComparison = 0;
  if (yesterdayRevenue > 0) {
    revenueComparison = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  } else if (todayRevenue > 0) {
    revenueComparison = 100;
  }

  return {
    todayRevenue,
    revenueComparison,
    todayOrdersCount,
    pendingOrdersCount,
    averageOrderValue,
  };
}

export async function getWeeklyRevenueTrend(): Promise<WeeklyRevenuePoint[]> {
  const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

  const result = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${orders.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Karachi'), 'Mon DD')`,
      revenue: sql<number>`sum(${orders.totalAmount})::int`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, sevenDaysAgo),
        ne(orders.status, 'cancelled')
      )
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Karachi')`)
    .orderBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Karachi')`);

  // Fill in missing days with 0
  const trend: WeeklyRevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "MMM dd");
    const found = result.find(r => r.date === dateStr);
    trend.push({
      date: dateStr,
      revenue: found?.revenue || 0,
      orders: found?.orders || 0,
    });
  }

  return trend;
}

export async function getTopSellingItems(limit = 5): Promise<TopSellingItem[]> {
  const result = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      categoryName: categories.name,
      totalSold: sql<number>`sum(${orderItems.quantity})::int`,
      totalRevenue: sql<number>`sum(${orderItems.subtotal})::int`,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(ne(orders.status, 'cancelled'))
    .groupBy(menuItems.id, menuItems.name, categories.name)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(limit);

  return result;
}

export async function getRecentOrders(limit = 5): Promise<RecentOrderSummary[]> {
  const result = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      itemsCount: sql<number>`count(${orderItems.id})::int`,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return result.map(r => ({
    ...r,
    createdAt: r.createdAt || new Date(),
  }));
}

export async function getLowStockAlerts(limit = 5): Promise<LowStockAlert[]> {
  // Query 1: Menu items explicitly marked as unavailable
  const unavailableItems = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      isAvailable: menuItems.isAvailable,
    })
    .from(menuItems)
    .where(eq(menuItems.isAvailable, false))
    .limit(limit);

  // Query 2: Inventory items below threshold
  const lowInventory = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.itemName,
      stockQuantity: inventoryItems.stockQuantity,
      unit: inventoryItems.unit,
      lowStockThreshold: inventoryItems.lowStockThreshold,
    })
    .from(inventoryItems)
    .where(sql`${inventoryItems.stockQuantity} <= ${inventoryItems.lowStockThreshold}`)
    .limit(limit);

  const alerts: LowStockAlert[] = [];
  
  for (const item of lowInventory) {
    alerts.push({
      id: item.id,
      name: item.name,
      stockQuantity: item.stockQuantity,
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold,
      isAvailable: true,
    });
  }

  for (const item of unavailableItems) {
    alerts.push({
      id: item.id,
      name: item.name,
      stockQuantity: 0,
      unit: "N/A",
      lowStockThreshold: 0,
      isAvailable: item.isAvailable || false,
    });
  }

  return alerts.slice(0, limit);
}
