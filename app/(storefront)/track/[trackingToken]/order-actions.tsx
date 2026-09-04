"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, XCircle, RotateCcw } from "lucide-react";
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
import { useCart } from "@/store/use-cart";

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

export function OrderActions({ orderId, status, items }: OrderActionsProps) {
  const router = useRouter();
  const { clearCart, addItem } = useCart();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const isPreCooking = PRE_COOKING_STATUSES.includes(status);

  // Neither button applies once preparing has started
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

  const handleReorder = () => {
    if (!items || items.length === 0) {
      toast.error("No items found to reorder.");
      return;
    }

    setIsReordering(true);
    clearCart();

    items.forEach((item) => {
      addItem({
        menuItemId: item.menuItem?.id ?? item.menuItemId ?? null,
        name: item.itemName,
        variantName: item.variantName ?? undefined,
        addOns:
          item.selectedAddOns && item.selectedAddOns.length > 0
            ? item.selectedAddOns
            : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.menuItem?.imageUrl ?? undefined,
      });
    });

    toast.success(`${items.length} item(s) added to your cart! Keep browsing or open cart to checkout.`);

    // Navigate to the menu — not checkout — so the customer can modify before paying.
    router.push("/menu");
  };

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      {/* Reorder: add items to cart and go to menu */}
      <Button
        className="font-bold rounded-none px-6 h-11 transition-all"
        onClick={handleReorder}
        disabled={isReordering}
      >
        {isReordering ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4 mr-2" />
        )}
        Reorder
      </Button>

      {/* Cancel Order: only when still pending */}
      {status === "pending" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="font-bold rounded-none px-6 h-11 transition-all shadow-sm hover:shadow-md"
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
