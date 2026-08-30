// app/admin/finance/page.tsx
import { getFinancialSummary } from "@/server/actions/finance";
import { FinanceDashboard } from "@/components/features/admin/finance/finance-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [today, month] = await Promise.all([
    getFinancialSummary("today"),
    getFinancialSummary("month"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Finance" 
        description="Revenue overview and financial tracking."
      />
      <div className="mt-8">
        <FinanceDashboard todayData={today.data} monthData={month.data} />
      </div>
    </div>
  );
}
