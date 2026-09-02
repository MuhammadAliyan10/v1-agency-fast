import { requireAdmin } from "@/lib/auth/session";
import { getRiders } from "@/server/actions/riders";
import { PageHeader } from "@/components/shared/page-header";
import { RidersTable } from "@/components/features/admin/riders/riders-table";
import { Bike } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RidersPage() {
  await requireAdmin();
  const result = await getRiders();

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Riders Management"
        description="Monitor and control all delivery personnel and their operational status."
      />

      {result.success ? (
        <RidersTable data={result.data ?? []} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border bg-muted/20 gap-3 text-muted-foreground">
          <Bike className="w-10 h-10 opacity-30" />
          <p className="font-semibold">Failed to load riders</p>
          <p className="text-sm opacity-70">Please try refreshing the page.</p>
        </div>
      )}
    </div>
  );
}
