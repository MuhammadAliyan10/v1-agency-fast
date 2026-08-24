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
  status: "pending" | "approved" | "preparing" | "delayed" | "out_for_delivery" | "delivered" | "rejected" | "cancelled";
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

export interface DashboardData {
  kpis: DashboardKPIs;
  weeklyRevenue: WeeklyRevenuePoint[];
  topItems: TopSellingItem[];
  recentOrders: RecentOrderSummary[];
  lowStock: LowStockAlert[];
}
