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
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Calculator, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-96" />
      <Skeleton className="h-96" />
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

  const session = await getSession();
  if (!hasPermission(session, "finance", "read")) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to view the Finance dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {/* Daily Register banner — quick access */}
      <Link
        href="/admin/finance/register"
        className="group flex items-center justify-between gap-4 border border-primary/25 bg-primary/5 hover:bg-primary/10 px-5 py-4 transition-colors print:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/15 text-primary">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <p className="font-black text-sm">Daily Register</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Close today&apos;s register — verify cash, rider collections, waiter reconciliation, and credit orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold shrink-0">
          Open Register
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>

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
