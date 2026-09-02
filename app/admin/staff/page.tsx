import { getStaff } from "@/server/actions/staff";
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { hasPermission } from "@/lib/auth/rbac";
import { StaffTable } from "@/components/features/admin/staff/staff-table";
import { StaffDialog } from "@/components/features/admin/staff/staff-dialog";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await verifySessionOrRedirect(["admin", "manager"]);

  // Only root admin and managers with explicitly granted `canManageStaff` permission can view this page.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Staff & Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage manager permissions, kitchen access, waiters, and riders.
          </p>
        </div>
        
        {session.role === "admin" ? (
          <StaffDialog>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </StaffDialog>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 border">
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Only root Admin can invite new staff.
          </div>
        )}
      </div>

      <StaffTable data={res.data || []} />
    </div>
  );
}
