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

// Using dynamic rendering for the dashboard
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, weeklyTrend, topItems, recentOrders, lowStockAlerts] = await Promise.all([
    getDashboardKPIs(),
    getWeeklyRevenueTrend(),
    getTopSellingItems(5),
    getRecentOrders(5),
    getLowStockAlerts(5)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Dashboard Overview" 
        description="Real-time revenue and business analytics." 
      />
      
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
