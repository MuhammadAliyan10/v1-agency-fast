// app/admin/finance/register/page.tsx
import { getRegisterCloseData } from "@/server/actions/finance";
import { PageHeader } from "@/components/shared/page-header";
import { RegisterClose } from "@/components/features/admin/finance/register-close";
import { RegisterDateFilter } from "@/components/features/admin/finance/register-date-filter";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
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
            You do not have permission to view the Daily Register.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const result = await getRegisterCloseData({ from, to });

  if (!result.success) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load register data</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, dd MMM yyyy");
  const dateLabel = from && to ? `${from} — ${to}` : `Today · ${today}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-primary/10 text-primary mt-0.5 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Daily Register</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateLabel} — verify all cash, riders, and credit before closing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick link to Finance analytics */}
          <Link
            href="/admin/finance"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1.5 hover:bg-muted/50 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Finance Analytics
          </Link>
          <RegisterDateFilter from={from} to={to} />
        </div>
      </div>

      {/* Register close component */}
      <RegisterClose data={result.data} dateLabel={dateLabel} />
    </div>
  );
}
