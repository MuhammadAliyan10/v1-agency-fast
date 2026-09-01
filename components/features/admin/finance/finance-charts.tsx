// components/features/admin/finance/finance-charts.tsx
"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyRevenue, WeekComparison, TopItem, PaymentBreakdown, FinancialStats } from "@/server/actions/finance";

interface FinanceChartsProps {
  dailyRevenue: DailyRevenue[];
  weekComparison: WeekComparison[];
  topItems: TopItem[];
  paymentBreakdown: PaymentBreakdown[];
  stats: FinancialStats;
}

const revenueChartConfig = {
  revenue:   { label: "Revenue (Rs.)",  color: "hsl(var(--primary))" },
  discounts: { label: "Discounts (Rs.)", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const weekChartConfig = {
  currentWeek: { label: "This Week", color: "hsl(var(--primary))" },
  lastWeek:    { label: "Last Week",  color: "hsl(217 20% 65%)" },
} satisfies ChartConfig;

const itemChartConfig = {
  totalQuantity: { label: "Units Sold", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const PAYMENT_COLORS: Record<string, string> = {
  Cash:      "hsl(142, 76%, 36%)",
  COD:       "hsl(217, 91%, 60%)",
  Card:      "hsl(262, 83%, 58%)",
  JazzCash:  "hsl(25, 95%, 53%)",
  EasyPaisa: "hsl(142, 71%, 45%)",
};

function fmtRevenue(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return `Rs. ${n.toLocaleString()}`;
}

export function FinanceCharts({ dailyRevenue, weekComparison, topItems, paymentBreakdown, stats }: FinanceChartsProps) {
  const totalRevForType = stats.deliveryRevenue + stats.pickupRevenue + stats.dineInRevenue;

  return (
    <div className="space-y-6">
      {/* Row 1 — Revenue Line + Week Comparison Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 30-Day Revenue Trend */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base">Revenue Trend</h3>
            <p className="text-xs text-muted-foreground">Daily revenue for the selected period</p>
          </div>
          <ChartContainer config={revenueChartConfig} className="h-64 w-full">
            <LineChart data={dailyRevenue} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(d: string) => d?.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Date: ${label}`}
                    labelKey="date"
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="discounts"
                stroke="var(--color-discounts)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        </div>

        {/* This Week vs Last Week */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base">Week-over-Week</h3>
            <p className="text-xs text-muted-foreground">This week vs last week daily revenue</p>
          </div>
          <ChartContainer config={weekChartConfig} className="h-64 w-full">
            <BarChart data={weekComparison} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelKey="day" />}
              />
              <Bar dataKey="currentWeek" fill="var(--color-currentWeek)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="lastWeek"    fill="var(--color-lastWeek)"    radius={[4, 4, 0, 0]} maxBarSize={28} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Row 2 — Top Items + Payment Methods + Type Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Selling Items */}
        <div className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base">Top Items</h3>
            <p className="text-xs text-muted-foreground">By units sold in period</p>
          </div>
          <ChartContainer config={itemChartConfig} className="h-56 w-full">
            <BarChart
              data={topItems}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="itemName"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={90}
                tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="itemName" />} />
              <Bar dataKey="totalQuantity" fill="var(--color-totalQuantity)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Payment Method Breakdown */}
        <div className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-5">
            <h3 className="font-bold text-base">Payment Methods</h3>
            <p className="text-xs text-muted-foreground">Revenue per payment channel</p>
          </div>
          <div className="space-y-4">
            {paymentBreakdown.map(p => {
              const total = paymentBreakdown.reduce((s, x) => s + Number(x.count), 0);
              const pct = total > 0 ? Math.round((Number(p.count) / total) * 100) : 0;
              const color = PAYMENT_COLORS[p.method] ?? "hsl(var(--primary))";
              return (
                <div key={p.method}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="font-semibold">{p.method}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs">{fmtRevenue(p.revenue)}</span>
                      <span className="text-muted-foreground text-xs ml-2">({p.count} orders)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Type Revenue Split */}
        <div className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-5">
            <h3 className="font-bold text-base">Revenue by Type</h3>
            <p className="text-xs text-muted-foreground">Channel performance breakdown</p>
          </div>
          <div className="space-y-5">
            {[
              { label: "Delivery", value: stats.deliveryRevenue, orders: stats.deliveryOrders, color: "#6366f1" },
              { label: "Pickup",   value: stats.pickupRevenue,   orders: stats.pickupOrders,   color: "#f59e0b" },
              { label: "Dine-In",  value: stats.dineInRevenue,   orders: stats.dineInOrders,   color: "#10b981" },
            ].map(t => {
              const pct = totalRevForType > 0 ? Math.round((t.value / totalRevForType) * 100) : 0;
              return (
                <div key={t.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                      <span className="font-semibold">{t.label}</span>
                      <span className="text-muted-foreground text-xs">({t.orders} orders)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">{fmtRevenue(t.value)}</span>
                      <span className="text-xs text-muted-foreground font-bold">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: t.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
