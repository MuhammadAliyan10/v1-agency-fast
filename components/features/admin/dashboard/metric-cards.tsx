// components/features/admin/dashboard/metric-cards.tsx
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, AlertCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { DashboardKPIs } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface MetricCardsProps {
  data: DashboardKPIs;
}

export function MetricCards({ data }: MetricCardsProps) {
  const isPositive = data.revenueComparison >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Today's Revenue — Primary KPI */}
      <div className="bg-primary text-primary-foreground rounded-xl p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary-foreground/80">Today's Sales</span>
          <div className="w-8 h-8 bg-primary-foreground/15 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-black tracking-tight">Rs. {data.todayRevenue.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded",
              isPositive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500/30 text-red-100"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(data.revenueComparison).toFixed(1)}%
            </span>
            <span className="text-xs text-primary-foreground/70">vs yesterday</span>
          </div>
        </div>
      </div>

      {/* Active Orders — Operational Alert */}
      <div className={cn(
        "rounded-xl p-5 flex flex-col gap-3 shadow-sm border",
        data.pendingOrdersCount > 0
          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
          : "bg-card border-border"
      )}>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-semibold",
            data.pendingOrdersCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
          )}>
            Active Orders
          </span>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            data.pendingOrdersCount > 0 ? "bg-amber-200/60 dark:bg-amber-900/60" : "bg-muted"
          )}>
            <AlertCircle className={cn(
              "h-4 w-4",
              data.pendingOrdersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-black tracking-tight">{data.pendingOrdersCount}</div>
          {data.pendingOrdersCount > 0 ? (
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 mt-1.5 hover:underline">
              View kitchen board <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground mt-1.5 block">Kitchen is clear</span>
          )}
        </div>
      </div>

      {/* Today's Orders Count */}
      <div className="bg-card rounded-xl p-5 flex flex-col gap-3 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Orders Today</span>
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-black tracking-tight">{data.todayOrdersCount.toLocaleString()}</div>
          <span className="text-xs text-muted-foreground mt-1.5 block">Total orders placed today</span>
        </div>
      </div>

      {/* Average Ticket Size */}
      <div className="bg-card rounded-xl p-5 flex flex-col gap-3 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Avg. Ticket Size</span>
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-black tracking-tight">Rs. {data.averageOrderValue.toLocaleString()}</div>
          <span className="text-xs text-muted-foreground mt-1.5 block">Average spend per order</span>
        </div>
      </div>
    </div>
  );
}
