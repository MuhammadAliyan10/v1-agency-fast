"use client";

import { useQuery } from "@tanstack/react-query";
import { getWaiterActiveOrders } from "@/server/actions/waiter";
import { ManualOrderDialog } from "@/components/features/admin/orders/manual-order-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, Utensils, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function WaiterBoard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["waiter-orders"],
    queryFn: async () => {
      const res = await getWaiterActiveOrders();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="flex justify-center p-8"><p className="text-zinc-500 animate-pulse">Loading tables...</p></div>;
  if (error) return <div className="flex justify-center p-8"><p className="text-red-500">Error loading tables.</p></div>;

  const orders = data || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-muted-foreground">Active Tables ({orders.length})</h2>
        <ManualOrderDialog>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Plus className="w-4 h-4 mr-2" /> New Table Order
          </Button>
        </ManualOrderDialog>
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground opacity-50 border-2 border-dashed rounded-xl p-8">
          <Utensils className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-bold">No Active Tables</h3>
          <p className="text-sm text-center mt-2 max-w-[250px]">You have no active tables. Click "New Table Order" to seat a customer.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const timeElapsed = order.createdAt ? formatDistanceToNow(new Date(order.createdAt)) : "Unknown time";
          
          return (
            <div key={order.id} className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b bg-muted/50 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-xl flex items-center gap-2">
                    Table {order.tableNumber || "N/A"}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> Seated {timeElapsed} ago
                  </p>
                </div>
                <Badge variant="outline" className={cn(
                  "uppercase text-[10px]",
                  order.status === "preparing" ? "border-amber-500 text-amber-500" :
                  order.status === "ready_for_pickup" ? "border-emerald-500 text-emerald-500" :
                  "text-muted-foreground"
                )}>
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
              
              <div className="p-4 flex-1">
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        <span className="text-muted-foreground mr-2 font-medium">{item.quantity}x</span> 
                        {item.itemName} {item.variantName ? `(${item.variantName})` : ""}
                      </span>
                      <span className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                        item.status === "served" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50" :
                        item.status === "preparing" ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t bg-muted/50 flex gap-2">
                <ManualOrderDialog existingOrder={order as any}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                    <Coffee className="w-4 h-4 mr-2" /> Append Round
                  </Button>
                </ManualOrderDialog>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
