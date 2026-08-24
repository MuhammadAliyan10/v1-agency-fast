import { PageHeader } from "@/components/shared/page-header";
import { LiveKanban } from "@/components/features/admin/orders/live-kanban";

export default function OrdersPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <PageHeader 
        heading="Live Orders" 
        description="Manage incoming and live orders in real-time." 
      />
      
      <div className="flex-1 min-h-0">
        <LiveKanban />
      </div>
    </div>
  );
}
