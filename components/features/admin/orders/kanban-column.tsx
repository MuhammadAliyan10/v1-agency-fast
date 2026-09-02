"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { OrderStatus, LiveOrder } from "@/server/actions/live-orders";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: OrderStatus;
  orders: LiveOrder[];
  role: "admin" | "manager" | "kitchen" | "cashier";
  onStatusChange: (id: string, status: OrderStatus) => void;
}

const statusConfig: Record<string, { label: string; color: string; borderColor: string }> = {
  pending: { label: "Pending / New", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300", borderColor: "border-amber-400 dark:border-amber-500" },
  approved: { label: "Approved", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300", borderColor: "border-blue-400 dark:border-blue-500" },
  preparing: { label: "Preparing", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300", borderColor: "border-purple-400 dark:border-purple-500" },
  ready_for_pickup: { label: "Ready", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300", borderColor: "border-emerald-400 dark:border-emerald-500" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300", borderColor: "border-indigo-400 dark:border-indigo-500" },
};

export function KanbanColumn({ status, orders, role, onStatusChange }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = statusConfig[status] || { label: status, color: "bg-muted text-foreground", borderColor: "border-border" };
  const isKitchen = role === "kitchen";

  return (
    <div className={cn(
      "flex flex-col shrink-0 h-full min-h-[calc(100vh-220px)] max-h-[300vh] bg-muted/20  overflow-hidden border border-border/50",
      isKitchen ? "w-full flex-1" : "w-[380px]"
    )}>
      <div className={cn("p-3.5 border-b font-semibold flex items-center justify-between shadow-sm", config.color)}>
        <span className={cn(isKitchen ? "text-xl uppercase tracking-wider font-bold" : "text-sm")}>
          {config.label}
        </span>
        <span className="bg-background/50 px-2 py-0.5 text-xs font-bold">
          {orders.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto p-3 space-y-3 transition-colors",
          isOver ? "bg-muted/80" : ""
        )}
      >
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <KanbanCard key={order.id} order={order} role={role} borderColor={config.borderColor} onStatusChange={onStatusChange} />
          ))}
        </SortableContext>
        
        {orders.length === 0 && (
          <div className="h-full min-h-[100px] flex items-center justify-center text-muted-foreground text-sm font-medium border-2 border-dashed border-border/50">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}
