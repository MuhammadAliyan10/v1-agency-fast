import { getStaff } from "@/server/actions/staff";
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { hasPermission } from "@/lib/auth/rbac";
import { StaffTable } from "@/components/features/admin/staff/staff-table";
import { StaffDialog } from "@/components/features/admin/staff/staff-dialog";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await verifySessionOrRedirect(["admin", "manager"]);

  if (session.role === "manager" && !hasPermission(session, "staff", "read")) {
    redirect("/admin/dashboard");
  }

  const res = await getStaff();
  if (!res.success) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive font-medium">{res.error}</p>
      </div>
    );
  }

  const isAdmin = session.role === "admin";
  const canCreate = isAdmin || hasPermission(session, "staff", "create");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Staff & Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage roles, portal access, and manager permission matrices.
          </p>
        </div>

        {isAdmin ? (
          <StaffDialog>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </StaffDialog>
        ) : canCreate ? (
          <StaffDialog>
            <Button variant="outline" className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Staff
            </Button>
          </StaffDialog>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 border">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            View-only — you don't have staff:create permission.
          </div>
        )}
      </div>

      {/* Security notice for managers */}
      {!isAdmin && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            You are viewing this page as a <strong>Manager</strong>. Only the root Admin can assign permissions,
            change roles, or edit Admin accounts.
          </span>
        </div>
      )}

      <StaffTable data={res.data || []} isAdmin={isAdmin} />
    </div>
  );
}
