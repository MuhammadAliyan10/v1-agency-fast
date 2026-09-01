import { getActivityLogs } from "@/server/actions/activity";
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { ActivityTable } from "@/components/features/admin/activity/activity-table";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await verifySessionOrRedirect(["admin", "manager"]);

  // STRICT DIRECTIVE: Only root admin can view the activity log
  if (session.role !== "admin") {
    redirect("/admin/dashboard");
  }

  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const validPage = isNaN(page) || page < 1 ? 1 : page;

  const res = await getActivityLogs(validPage, 20);

  if (!res.success || !res.data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive font-medium">{res.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Immutable record of all system modifications. Restricted to Root Admin.
          </p>
        </div>
      </div>

      <ActivityTable data={res.data.logs} pagination={res.data.pagination} />
    </div>
  );
}
