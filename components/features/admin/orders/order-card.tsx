// components/features/admin/orders/order-card.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle, ChefHat, Bike, CheckCircle2, User, MapPin, Loader2, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/actions/live-orders";

interface OrderCardProps {
  order: any;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onClick: () => void;
  isUpdating: boolean;
  updatingId: string | null;
}

const statusConfig: Record<string, { label: string; badgeClass: string; bgClass: string }> = {
  pending:          { label: "New Order",      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",   bgClass: "bg-card" },
  approved:         { label: "Approved",       badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",        bgClass: "bg-card" },
  preparing:        { label: "Preparing",      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400", bgClass: "bg-card" },
  out_for_delivery: { label: "Out for Delivery", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400", bgClass: "bg-card" },
};

export function OrderCard({ order, onUpdateStatus, onClick, isUpdating, updatingId }: OrderCardProps) {
  const timeAgo = order.createdAt
    ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
    : "N/A";

  const hasSpecialInstructions = order.items?.some((i: any) => i.specialInstructions);
  const config = statusConfig[order.status] ?? statusConfig["pending"];
  const isThisUpdating = updatingId === order.id;

  const handleAction = (e: React.MouseEvent, nextStatus: OrderStatus) => {
    e.stopPropagation();
    onUpdateStatus(order.id, nextStatus);
  };

  const renderPrimaryAction = () => {
    switch (order.status) {
      case "pending":
      case "approved":
        return (
          <Button
            size="sm"
            className="w-full h-9 font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-2"
            disabled={isUpdating}
            onClick={(e) => handleAction(e, "preparing")}
          >
            {isThisUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
            Start Preparing
          </Button>
        );
      case "preparing":
        return (
          <Button
            size="sm"
            className="w-full h-9 font-semibold bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
            disabled={isUpdating}
            onClick={(e) => handleAction(e, "out_for_delivery")}
          >
            {isThisUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
            Send Out for Delivery
          </Button>
        );
      case "out_for_delivery":
        return (
          <Button
            size="sm"
            className="w-full h-9 font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            disabled={isUpdating}
            onClick={(e) => handleAction(e, "delivered")}
          >
            {isThisUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark Delivered
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40",
        config.bgClass,
        isThisUpdating && "opacity-60 pointer-events-none"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-tight text-foreground">#{order.id.slice(-6).toUpperCase()}</span>
            <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 font-semibold", config.badgeClass)}>
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-base text-foreground">Rs. {order.totalAmount?.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="px-4 pb-3 space-y-1.5 border-t border-border/50 pt-3">
        <div className="flex items-center gap-1.5 text-xs">
          <User className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground truncate">{order.customerName}</span>
        </div>
        
        {order.orderType === "pickup" ? (
          <div className="flex items-start gap-1.5 text-xs">
            <Store className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
            <span className="text-blue-600 font-semibold line-clamp-1 leading-snug">Self Pickup</span>
          </div>
        ) : (
          <div className="flex items-start gap-1.5 text-xs">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground line-clamp-2 leading-snug">{order.deliveryAddress || "No address provided"}</span>
          </div>
        )}
      </div>

      {/* Special Instructions Alert */}
      {hasSpecialInstructions && (
        <div className="mx-4 mb-3 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2.5 py-1.5 rounded-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Special Instructions
        </div>
      )}

      {/* Assigned Rider Info */}
      {order.rider && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/50">
            <Bike className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>Rider: <span className="font-semibold text-foreground">{order.rider.name}</span></span>
          </div>
        </div>
      )}

      {/* Primary Action */}
      <div className="px-4 pb-4">
        {renderPrimaryAction()}
      </div>
    </div>
  );
}
