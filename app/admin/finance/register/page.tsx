// app/admin/finance/register/page.tsx
import { getRegisterState, getRegisterCloseData } from "@/server/actions/finance";
import { PageHeader } from "@/components/shared/page-header";
import { RegisterClose } from "@/components/features/admin/finance/register-close";
import { OpenRegisterScreen } from "@/components/features/admin/finance/open-register-screen";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (!hasPermission(session, "finance", "read")) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to view the Daily Register.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check for open register shift
  const stateResult = await getRegisterState();
  if (!stateResult.success) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{stateResult.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const shift = stateResult.data;

  // If no shift is open, show Open Register Screen
  if (!shift) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <OpenRegisterScreen />
      </div>
    );
  }

  // Fetch data for the active shift
  const result = await getRegisterCloseData(shift.id);

  if (!result.success) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load register data</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader 
          heading="Daily Register"
          description="Active Shift — verify all cash and riders before closing"
        >
          <div className="flex items-center gap-2">
            <PrintButton />
          </div>
        </PageHeader>
      </div>

      {/* Register close component */}
      <RegisterClose data={result.data} />
    </div>
  );
}
