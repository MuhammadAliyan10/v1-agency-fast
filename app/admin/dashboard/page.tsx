import { PageHeader } from "@/components/shared/page-header";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getDashboardKPIs, 
  getWeeklyRevenueTrend, 
  getTopSellingItems, 
  getRecentOrders,
  getLowStockAlerts
} from "@/server/queries/admin-analytics";
import { MetricCards } from "@/components/features/admin/dashboard/metric-cards";
import { RevenueChart } from "@/components/features/admin/dashboard/revenue-chart";
import { TopSellingWidget } from "@/components/features/admin/dashboard/top-selling-widget";
import { RecentOrdersTable } from "@/components/features/admin/dashboard/recent-orders-table";
import { StoreStatusToggle } from "@/components/features/admin/dashboard/store-status-toggle";
import { getStoreStatus } from "@/server/actions/settings";

// Using dynamic rendering for the dashboard
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, weeklyTrend, topItems, recentOrders, lowStockAlerts, isStoreOpen] = await Promise.all([
    getDashboardKPIs(),
    getWeeklyRevenueTrend(),
    getTopSellingItems(5),
    getRecentOrders(5),
    getLowStockAlerts(5),
    getStoreStatus()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader 
          heading="Dashboard Overview" 
          description="Real-time revenue and business analytics." 
        />
        <div className="w-full md:w-auto min-w-[280px]">
          <StoreStatusToggle initialStatus={isStoreOpen} />
        </div>
      </div>
      
      <MetricCards data={kpis} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={weeklyTrend} />
        </div>
        <div>
          <TopSellingWidget data={topItems} />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1">
        <RecentOrdersTable data={recentOrders} />
      </div>
    </div>
  );
}
