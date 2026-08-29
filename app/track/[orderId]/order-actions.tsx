"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/server/actions/storefront";

interface OrderActionsProps {
  orderId: string;
  status: string;
}

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // According to prompt: "both button Cancel and reorder will be descable if the stus will be preparing"
  // Assuming they mean disabled if the order is currently active/preparing. 
  // We'll disable Cancel if it's not pending.
  const canCancel = status === "pending";
  const isPreparing = status === "preparing";
  
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    
    setIsCancelling(true);
    const res = await cancelOrder(orderId);
    setIsCancelling(false);

    if (res.success) {
      toast.success("Order cancelled successfully");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to cancel order");
    }
  };

  const handleReorder = async () => {
    setIsReordering(true);
    toast.success("Redirecting to menu...");
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Button 
        className="font-bold rounded-none px-6 h-11 transition-all"
        onClick={handleReorder}
        disabled={isReordering || isPreparing}
      >
        {isReordering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
        Reorder
      </Button>

      {canCancel && (
        <Button 
          variant="destructive" 
          className="font-bold rounded-none px-6 h-11 transition-all shadow-sm hover:shadow-md"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
          Cancel Order
        </Button>
      )}
    </div>
  );
}
