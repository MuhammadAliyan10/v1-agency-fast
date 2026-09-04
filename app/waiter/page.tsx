import { WaiterBoard } from "@/components/features/waiter/waiter-board";
import { requireWaiter } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function WaiterPage() {
  await requireWaiter();
  return <WaiterBoard />;
}
