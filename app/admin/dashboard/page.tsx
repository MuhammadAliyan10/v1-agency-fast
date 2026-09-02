import { PageHeader } from "@/components/shared/page-header";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getDashboardKPIs, 
  getWeeklyRevenueTrend, 
  getTopSellingItems, 
  getRecentOrders,
  getLowStockAlerts,
  getOrderSourceDistribution
} from "@/server/queries/admin-analytics";
import { MetricCards } from "@/components/features/admin/dashboard/metric-cards";
import { RevenueChart } from "@/components/features/admin/dashboard/revenue-chart";
import { OrderSourceChart } from "@/components/features/admin/dashboard/order-source-chart";
import { LowStockWidget } from "@/components/features/admin/dashboard/low-stock-widget";
import { TopSellingWidget } from "@/components/features/admin/dashboard/top-selling-widget";
import { RecentOrdersTable } from "@/components/features/admin/dashboard/recent-orders-table";
import { StoreStatusToggle } from "@/components/features/admin/dashboard/store-status-toggle";
import { getStoreStatus } from "@/server/actions/settings";

// Using dynamic rendering for the dashboard
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const isStoreOpen = await getStoreStatus();

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
      
      <Suspense fallback={<Skeleton className="h-[120px] w-full" />}>
        <KPIsWrapper />
      </Suspense>

      {/* Row 2: Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <RevenueChartWrapper />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <OrderSourceWrapper />
          </Suspense>
        </div>
      </div>

      {/* Row 3: Operational Widgets */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <TopSellingWrapper />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <LowStockWrapper />
          </Suspense>
        </div>
      </div>

      {/* Row 4: Recent Orders */}
      <div className="grid gap-6 grid-cols-1">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <RecentOrdersWrapper />
        </Suspense>
      </div>
    </div>
  );
}

// Server Component Wrappers for parallel data fetching
async function KPIsWrapper() {
  const kpis = await getDashboardKPIs();
  return <MetricCards data={kpis} />;
}

async function RevenueChartWrapper() {
  const weeklyTrend = await getWeeklyRevenueTrend();
  return <RevenueChart data={weeklyTrend} />;
}

async function TopSellingWrapper() {
  const topItems = await getTopSellingItems(5);
  return <TopSellingWidget data={topItems} />;
}

async function RecentOrdersWrapper() {
  const recentOrders = await getRecentOrders(5);
  return <RecentOrdersTable data={recentOrders} />;
}

async function OrderSourceWrapper() {
  const sources = await getOrderSourceDistribution();
  return <OrderSourceChart data={sources} />;
}

async function LowStockWrapper() {
  const lowStock = await getLowStockAlerts(5);
  return <LowStockWidget data={lowStock} />;
}
