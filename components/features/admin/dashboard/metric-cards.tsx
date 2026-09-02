// components/features/admin/dashboard/metric-cards.tsx
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { DashboardKPIs } from "@/types/analytics";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetricCardsProps {
  data: DashboardKPIs;
}

export function MetricCards({ data }: MetricCardsProps) {
  const isPositive = data.revenueComparison >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Today's Revenue — Primary KPI */}
      <Card className="bg-primary text-primary-foreground border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-primary-foreground/80">Today's Sales</CardTitle>
          <div className="w-8 h-8 bg-primary-foreground/15 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight">Rs. {data.todayRevenue.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded",
              isPositive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500/30 text-red-100"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(data.revenueComparison).toFixed(1)}%
            </span>
            <span className="text-xs text-primary-foreground/70">vs yesterday</span>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders — Operational Alert */}
      <Card className={cn(
        "shadow-sm relative overflow-hidden transition-all",
        data.pendingOrdersCount > 0
          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-500/20"
          : "bg-card border-border"
      )}>
        {data.pendingOrdersCount > 0 && (
          <div className="absolute top-0 right-0 w-full h-1 bg-amber-500 animate-pulse" />
        )}
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className={cn(
            "text-sm font-semibold",
            data.pendingOrdersCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
          )}>
            Active Orders
          </CardTitle>
          <div className={cn(
            "w-8 h-8  flex items-center justify-center",
            data.pendingOrdersCount > 0 ? "bg-amber-200/60 dark:bg-amber-900/60" : "bg-muted"
          )}>
            <AlertCircle className={cn(
              "h-4 w-4",
              data.pendingOrdersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight">{data.pendingOrdersCount}</div>
          {data.pendingOrdersCount > 0 ? (
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 mt-2 hover:underline">
              View kitchen board <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground mt-2 block">Kitchen is clear</span>
          )}
        </CardContent>
      </Card>

      {/* Today's Orders Count */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Orders Today</CardTitle>
          <div className="w-8 h-8 bg-muted flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight">{data.todayOrdersCount.toLocaleString()}</div>
          <span className="text-xs text-muted-foreground mt-2 block">Total orders placed today</span>
        </CardContent>
      </Card>

      {/* Average Ticket Size */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Avg. Ticket Size</CardTitle>
          <div className="w-8 h-8 bg-muted flex items-center justify-center">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight">Rs. {data.averageOrderValue.toLocaleString()}</div>
          <span className="text-xs text-muted-foreground mt-2 block">Average spend per order</span>
        </CardContent>
      </Card>
    </div>
  );
}
