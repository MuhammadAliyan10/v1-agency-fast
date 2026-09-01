import { LiveOrdersBoard } from "@/components/features/admin/orders/kanban-board";

export const dynamic = "force-dynamic";

export default function KitchenPage() {
  return (
    <div className="h-full flex-1 flex flex-col">
      <LiveOrdersBoard role="kitchen" />
    </div>
  );
}
