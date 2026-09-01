import type { InferSelectModel } from "drizzle-orm";
import { orders } from "@/database/schema";

export type Order = InferSelectModel<typeof orders>;
export type OrderStatus = Order["status"];

export interface DashboardKPIs {
  todayRevenue: number;
  revenueComparison: number; // percentage difference from yesterday
  todayOrdersCount: number;
  pendingOrdersCount: number;
  averageOrderValue: number;
}

export interface WeeklyRevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  categoryName: string;
}

export interface RecentOrderSummary {
  id: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  totalAmount: number;
  source: Order["source"];
  orderType: Order["orderType"];
  status: OrderStatus;
  createdAt: Date;
}

export interface LowStockAlert {
  id: string;
  name: string;
  stockQuantity: number;
  unit: string;
  lowStockThreshold: number;
  isAvailable: boolean;
}

export interface OrderSourceData {
  source: Order["source"];
  revenue: number;
  orders: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  weeklyRevenue: WeeklyRevenuePoint[];
  topItems: TopSellingItem[];
  recentOrders: RecentOrderSummary[];
  lowStock: LowStockAlert[];
  orderSources: OrderSourceData[];
}
