import { PageHeader } from "@/components/shared/page-header";
import { LiveOrdersBoard } from "@/components/features/admin/orders/kanban-board";
import { verifyToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LiveOrdersPage() {
  // Extract role from session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cc_admin_session");
  const session = sessionCookie ? await verifyToken(sessionCookie.value) : null;
  const role = session?.role || "admin";

  return (
    <div className="h-full flex flex-col min-w-0 max-w-full">
      <LiveOrdersBoard role={role as "admin" | "manager" | "kitchen" | "cashier"} />
    </div>
  );
}
