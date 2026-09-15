"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, XCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelOrder } from "@/server/actions/storefront";
import { STORE_CONSTANTS } from "@/lib/constants";

interface OrderItem {
  menuItemId?: string;
  menuItem?: { id: string; imageUrl?: string | null };
  itemName: string;
  variantName?: string | null;
  selectedAddOns?: { name: string; price: number }[] | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

type OrderStatus =
  | "pending"
  | "approved"
  | "preparing"
  | "delayed"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

interface OrderActionsProps {
  orderId: string;
  status: OrderStatus;
  items: OrderItem[];
}

// Both actions are only allowed before the kitchen starts: pending & approved only.
const PRE_COOKING_STATUSES: OrderStatus[] = ["pending", "approved"];

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const isPreCooking = PRE_COOKING_STATUSES.includes(status);

  // Actions are only shown while the order is pending or approved
  if (!isPreCooking) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    const res = await cancelOrder(orderId);
    setIsCancelling(false);

    if (res.success) {
      toast.success("Order cancelled successfully.");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to cancel order.");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
      {/* Call to Modify Button */}
      <Button asChild className="font-bold rounded-none px-6 h-11 transition-all flex items-center justify-center bg-green-600 hover:bg-green-700 text-white">
        <a href={`tel:${STORE_CONSTANTS.RAW_PHONE_NUMBER}`}>
          <Phone className="w-4 h-4 mr-2" />
          Call to Change Order
        </a>
      </Button>

      {/* Cancel Order: available during pending and approved */}
      {(status === "pending" || status === "approved") && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="font-bold rounded-none px-6 h-11 transition-all shadow-sm hover:shadow-md w-full sm:w-auto"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Cancel Order
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
