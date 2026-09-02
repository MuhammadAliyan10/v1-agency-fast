import { getOutboxMessages } from "@/server/actions/outbox";
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { hasPermission } from "@/lib/auth/rbac";
import { OutboxTable } from "@/components/features/admin/outbox/outbox-table";
import { BroadcastDialog } from "@/components/features/admin/outbox/broadcast-dialog";
import { Button } from "@/components/ui/button";
import { Megaphone, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminOutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await verifySessionOrRedirect(["admin", "manager"]);

  // Managers need explicit broadcast permission
  if (session.role === "manager" && !hasPermission(session, "whatsapp", "create")) {
    redirect("/admin/dashboard");
  }

  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const validPage = isNaN(page) || page < 1 ? 1 : page;

  const res = await getOutboxMessages(validPage, 20);

  if (!res.success || !res.data) {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">CRM Outbox</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            Monitor and queue outbound WhatsApp/SMS communications.
          </p>
        </div>
        
        <BroadcastDialog>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Megaphone className="w-4 h-4" />
            New Broadcast
          </Button>
        </BroadcastDialog>
      </div>

      <OutboxTable data={res.data.messages} pagination={res.data.pagination} />
    </div>
  );
}
