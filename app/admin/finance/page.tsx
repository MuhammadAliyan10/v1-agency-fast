// app/admin/finance/page.tsx
import { Suspense } from "react";
import { getFinancialSummary } from "@/server/actions/finance";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceDateFilter } from "@/components/features/admin/finance/finance-date-filter";
import { FinanceKPIs } from "@/components/features/admin/finance/finance-kpis";
import { FinanceCharts } from "@/components/features/admin/finance/finance-charts";
import { FinanceTables } from "@/components/features/admin/finance/finance-tables";
import { PrintableLedger } from "@/components/features/admin/finance/printable-ledger";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from;
  const to = params.to;

  const result = await getFinancialSummary({ from, to });

  if (!result.success) {
    return (
      <div className="p-8 text-center text-destructive">
        <p className="font-bold">Failed to load financial data.</p>
        <p className="text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Header — hidden on print */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <PageHeader
          heading="Finance"
          description="Business intelligence, revenue analysis, and financial tracking."
          className="mb-0"
        />
        <FinanceDateFilter from={from} to={to} />
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-black">Financial Report</h1>
        {from && to && <p className="text-sm text-gray-600">{from} — {to}</p>}
        <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* KPI Row */}
      <Suspense fallback={<KPISkeleton />}>
        <FinanceKPIs stats={data.stats} lostRevenue={data.lostRevenue} />
      </Suspense>

      {/* Charts */}
      <div className="print:hidden">
        <Suspense fallback={<ChartSkeleton />}>
          <FinanceCharts
            dailyRevenue={data.dailyRevenue}
            weekComparison={data.weekComparison}
            topItems={data.topItems}
            paymentBreakdown={data.paymentBreakdown}
            stats={data.stats}
          />
        </Suspense>
      </div>

      {/* Tables */}
      <div className="print:hidden">
        <Suspense fallback={<TableSkeleton />}>
          <FinanceTables
            unpaidOrders={data.unpaidOrders}
            lostOrders={data.lostOrders}
          />
        </Suspense>
      </div>

      {/* Printable Ledger (hidden on screen) */}
      <PrintableLedger dailyRevenue={data.dailyRevenue} stats={data.stats} from={from} to={to} />
    </div>
  );
}
