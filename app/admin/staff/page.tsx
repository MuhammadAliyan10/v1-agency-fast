import { requireAdmin } from "@/lib/auth/session";
import { getStaff } from "@/server/actions/staff";
import { PageHeader } from "@/components/shared/page-header";
import { StaffTable } from "@/components/features/admin/staff/staff-table";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await requireAdmin();
  const result = await getStaff();

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Staff Management"
        description="Manage admin and manager accounts and their access status."
      />

      {result.success ? (
        <StaffTable data={result.data ?? []} currentUserId={session.id} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border rounded-xl bg-muted/20 gap-3 text-muted-foreground">
          <Users className="w-10 h-10 opacity-30" />
          <p className="font-semibold">Failed to load staff</p>
          <p className="text-sm opacity-70">Please try refreshing the page.</p>
        </div>
      )}
    </div>
  );
}
