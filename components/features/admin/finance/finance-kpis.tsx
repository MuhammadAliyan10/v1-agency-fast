// components/features/admin/finance/finance-kpis.tsx
import type { FinancialStats } from "@/server/actions/finance";
import { TrendingUp, TrendingDown, Banknote, ShoppingBag, AlertTriangle, Tag, Truck, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceKPIsProps {
  stats: FinancialStats;
  lostRevenue: number;
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "danger" | "warning" | "muted";
}) {
  const variantStyles: Record<string, string> = {
    default: "border-border/60 bg-card",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20",
    danger:  "border-rose-200   dark:border-rose-900/50   bg-rose-50/50   dark:bg-rose-950/20",
    warning: "border-amber-200  dark:border-amber-900/50  bg-amber-50/50  dark:bg-amber-950/20",
    muted:   "border-border/40 bg-muted/30",
  };
  const iconStyles: Record<string, string> = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50",
    danger:  "text-rose-600   bg-rose-100   dark:bg-rose-900/50",
    warning: "text-amber-600  bg-amber-100  dark:bg-amber-900/50",
    muted:   "text-muted-foreground bg-muted/60",
  };
  const valueStyles: Record<string, string> = {
    default: "text-foreground",
    success: "text-emerald-700 dark:text-emerald-400",
    danger:  "text-rose-700   dark:text-rose-400",
    warning: "text-amber-700  dark:text-amber-400",
    muted:   "text-muted-foreground",
  };

  return (
    <div className={cn(" border p-5 flex flex-col gap-3 transition-all", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={cn("p-1.5 ", iconStyles[variant])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div>
        <p className={cn("text-2xl font-black tracking-tight leading-none", valueStyles[variant])}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

export function FinanceKPIs({ stats, lostRevenue }: FinanceKPIsProps) {
  const collectionRate = stats.grossSales > 0
    ? Math.round((stats.paidAmount / (stats.grossSales - stats.totalDiscounts + stats.totalDeliveryFees)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Net Revenue"
          value={`Rs. ${stats.netRevenue.toLocaleString()}`}
          sub="After discounts"
          icon={Banknote}
          variant="success"
        />
        <KPICard
          label="Gross Sales"
          value={`Rs. ${stats.grossSales.toLocaleString()}`}
          sub="Before deductions"
          icon={TrendingUp}
          variant="default"
        />
        <KPICard
          label="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          sub={`Avg Rs. ${stats.avgOrderValue.toLocaleString()}`}
          icon={ShoppingBag}
          variant="default"
        />
        <KPICard
          label="Discounts Given"
          value={`Rs. ${stats.totalDiscounts.toLocaleString()}`}
          sub="Promo cost"
          icon={Tag}
          variant="warning"
        />
        <KPICard
          label="Unpaid Outstanding"
          value={`Rs. ${stats.unpaidAmount.toLocaleString()}`}
          sub={`${collectionRate}% collected`}
          icon={AlertTriangle}
          variant="danger"
        />
        <KPICard
          label="Lost Revenue"
          value={`Rs. ${lostRevenue.toLocaleString()}`}
          sub="Cancelled & rejected"
          icon={TrendingDown}
          variant="danger"
        />
      </div>

      {/* Secondary — Order type split */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          label="Delivery Revenue"
          value={`Rs. ${stats.deliveryRevenue.toLocaleString()}`}
          sub={`${stats.deliveryOrders} orders`}
          icon={Truck}
          variant="muted"
        />
        <KPICard
          label="Pickup Revenue"
          value={`Rs. ${stats.pickupRevenue.toLocaleString()}`}
          sub={`${stats.pickupOrders} orders`}
          icon={Receipt}
          variant="muted"
        />
        <KPICard
          label="Dine-In Revenue"
          value={`Rs. ${stats.dineInRevenue.toLocaleString()}`}
          sub={`${stats.dineInOrders} orders`}
          icon={Receipt}
          variant="muted"
        />
      </div>
    </div>
  );
}
