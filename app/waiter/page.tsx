import { WaiterBoard } from "@/components/features/waiter/waiter-board";
import { requireWaiter } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function WaiterPage() {
  const session = await requireWaiter();
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tables</h1>
          <p className="text-sm text-muted-foreground">Manage your active dine-in orders</p>
        </div>
      </div>
      <div className="py-2">
        <WaiterBoard />
      </div>
    </div>
  );
}
