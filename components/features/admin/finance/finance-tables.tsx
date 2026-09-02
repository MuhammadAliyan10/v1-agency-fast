// components/features/admin/finance/finance-tables.tsx
"use client";

import { useTransition, useOptimistic } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { markOrderPaid } from "@/server/actions/finance";
import type { UnpaidOrder, LostOrder } from "@/server/actions/finance";
import Link from "next/link";

interface FinanceTablesProps {
  unpaidOrders: UnpaidOrder[];
  lostOrders: LostOrder[];
}

function UnpaidTable({ initialOrders }: { initialOrders: UnpaidOrder[] }) {
  const [isPending, startTransition] = useTransition();
  const [orders, setOptimisticOrders] = useOptimistic(
    initialOrders,
    (state: UnpaidOrder[], removedId: string) => state.filter(o => o.id !== removedId)
  );

  const handleMarkPaid = (orderId: string) => {
    startTransition(async () => {
      setOptimisticOrders(orderId);
      const res = await markOrderPaid(orderId);
      if (res.success) {
        toast.success(`Order ${orderId} marked as paid`);
      } else {
        toast.error(res.error ?? "Failed to mark as paid");
      }
    });
  };

  const totalUnpaid = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="border border-rose-200 dark:border-rose-900/40 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-rose-50/50 dark:bg-rose-950/10">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Unpaid Orders
            <Badge variant="destructive" className="text-xs font-bold">{orders.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total outstanding: <span className="font-bold text-rose-600 dark:text-rose-400">Rs. {totalUnpaid.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All cleared — no unpaid orders!</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {orders.map(order => (
            <div
              key={order.id}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono font-black text-sm hover:text-primary transition-colors"
                  >
                    #{order.id}
                  </Link>
                  <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0 font-bold">
                    {order.orderType.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {order.paymentMethod}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {order.customerName} · {order.customerPhone}
                  {order.createdAt && ` · ${format(new Date(order.createdAt), "MMM d, h:mm a")}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-sm text-rose-600 dark:text-rose-400">
                  Rs. {order.totalAmount.toLocaleString()}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  disabled={isPending}
                  onClick={() => handleMarkPaid(order.id)}
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  )}
                  Mark Paid
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LostTable({ orders }: { orders: LostOrder[] }) {
  const totalLost = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="border border-amber-200 dark:border-amber-900/40 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-amber-50/50 dark:bg-amber-950/10">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-500" />
            Lost Revenue
            <Badge className="text-xs font-bold bg-amber-500 text-white border-0">{orders.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total lost: <span className="font-bold text-amber-600 dark:text-amber-400">Rs. {totalLost.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">No cancelled or rejected orders in this period.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {orders.map(order => (
            <div
              key={order.id}
              className="px-6 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-black text-sm hover:text-primary transition-colors"
                    >
                      #{order.id}
                    </Link>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase px-1.5 py-0 font-bold ${
                        order.status === "cancelled"
                          ? "border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/30"
                          : "border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950/30"
                      }`}
                    >
                      {order.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0">
                      {order.orderType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.customerName}
                    {order.createdAt && ` · ${format(new Date(order.createdAt), "MMM d, h:mm a")}`}
                  </p>
                  {(order.rejectionReason ?? order.delayReason) && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 italic">
                      Reason: {order.rejectionReason ?? order.delayReason}
                    </p>
                  )}
                </div>
                <span className="font-black text-sm text-amber-600 dark:text-amber-400 shrink-0">
                  Rs. {order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinanceTables({ unpaidOrders, lostOrders }: FinanceTablesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UnpaidTable initialOrders={unpaidOrders} />
      <LostTable orders={lostOrders} />
    </div>
  );
}
