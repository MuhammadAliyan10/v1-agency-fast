"use client";

import { useQuery } from "@tanstack/react-query";
import { getWaiterActiveOrders } from "@/server/actions/waiter";
import { getTablesWithStatus } from "@/server/actions/tables";
import { ManualOrderDialog } from "@/components/features/admin/orders/manual-order-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, Utensils, AlertCircle, Clock, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WaiterBoard() {
  const { data: tablesRes, isLoading: isTablesLoading } = useQuery({
    queryKey: ["waiter-tables"],
    queryFn: getTablesWithStatus,
    refetchInterval: 5000,
  });

  const { data: ordersRes, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["waiter-orders"],
    queryFn: getWaiterActiveOrders,
    refetchInterval: 5000,
  });

  if (isTablesLoading || isOrdersLoading) return <div className="flex justify-center p-8"><p className="text-zinc-500 animate-pulse">Loading tables...</p></div>;
  if (tablesRes?.error || ordersRes?.error) return <div className="flex justify-center p-8"><p className="text-red-500">Error loading tables.</p></div>;

  const tables = tablesRes?.data || [];
  const orders = ordersRes?.data || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-muted-foreground">Restaurant Tables ({tables.length})</h2>
        <ManualOrderDialog>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Plus className="w-4 h-4 mr-2" /> Quick Order
          </Button>
        </ManualOrderDialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map(table => {
          if (table.isOccupied) {
            // Find the active order
            const activeOrder = orders.find(o => table.activeOrderIds.includes(o.id));
            
            return (
              <ManualOrderDialog key={table.id} existingOrder={activeOrder as any}>
                <Card className="cursor-pointer hover:border-red-400 transition-all active:scale-95 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 h-[140px] flex flex-col justify-between overflow-hidden relative">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-black text-red-700 dark:text-red-400">
                        {table.name}
                      </CardTitle>
                      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 pointer-events-none">
                        Occupied
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {activeOrder ? (
                      <div className="text-left">
                        <p className="text-sm font-bold text-red-900 dark:text-red-300">
                          {activeOrder.customerName || "Guest"}
                        </p>
                        <p className="text-xs text-red-700/80 dark:text-red-400/80 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(activeOrder.createdAt!), { addSuffix: true })}
                        </p>
                        <div className="text-xs text-red-700/80 dark:text-red-400/80 mt-1 font-medium">
                          {activeOrder.items?.length || 0} items ordered
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-700/80 dark:text-red-400/80 text-left">Active order loading...</p>
                    )}
                  </CardContent>
                  <div className="absolute bottom-0 w-full bg-red-100 dark:bg-red-900/30 text-[10px] text-center py-1 font-bold text-red-700 dark:text-red-400 uppercase tracking-widest border-t border-red-200 dark:border-red-900/50">
                    Tap to Append Round
                  </div>
                </Card>
              </ManualOrderDialog>
            );
          }

          // Free table
          return (
            <ManualOrderDialog key={table.id} defaultTableId={table.id} defaultTableNumber={table.name}>
              <Card className="cursor-pointer hover:border-emerald-400 transition-all active:scale-95 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 h-[140px] flex flex-col justify-between overflow-hidden relative">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                      {table.name}
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 pointer-events-none">
                      Free
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 text-left">
                    Capacity: {table.capacity}
                  </p>
                </CardContent>
                <div className="absolute bottom-0 w-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] text-center py-1 font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest border-t border-emerald-200 dark:border-emerald-900/50">
                  Tap to Seat & Order
                </div>
              </Card>
            </ManualOrderDialog>
          );
        })}
      </div>
    </div>
  );
}
