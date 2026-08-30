"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markOrderPaid } from "@/server/actions/finance";
import { toast } from "sonner";
import { TrendingUp, ShoppingBag, Banknote, Percent, Truck, Store } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

interface FinanceDashboardProps {
  todayData: any;
  monthData: any;
}

export function FinanceDashboard({ todayData, monthData }: FinanceDashboardProps) {
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>(monthData?.unpaidOrders || []);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const today = todayData?.stats;
  const month = monthData?.stats;

  const handleMarkPaid = async (orderId: string) => {
    setMarkingPaid(orderId);
    const res = await markOrderPaid(orderId);
    if (res.success) {
      toast.success(`Order ${orderId} marked as paid`);
      setUnpaidOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      toast.error("Failed to mark as paid");
    }
    setMarkingPaid(null);
  };

  const dailyRevenue = monthData?.dailyRevenue || [];
  const topItems = monthData?.topItems || [];
  const paymentBreakdown = monthData?.paymentBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Today Stats */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Today</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: `Rs. ${(today?.totalRevenue || 0).toLocaleString()}`, icon: Banknote, color: "text-green-600" },
            { label: "Orders", value: today?.totalOrders || 0, icon: ShoppingBag, color: "text-blue-600" },
            { label: "Delivery", value: today?.deliveryOrders || 0, icon: Truck, color: "text-orange-600" },
            { label: "Pickup", value: today?.pickupOrders || 0, icon: Store, color: "text-purple-600" },
          ].map(stat => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-black tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 30-day Revenue Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Revenue — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rs. ${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="itemName" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v: any) => [v, "Qty sold"]} />
                  <Bar dataKey="totalQuantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Payment Breakdown (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {paymentBreakdown.map((p: any) => {
                const total = paymentBreakdown.reduce((s: number, x: any) => s + Number(x.count), 0);
                const pct = total > 0 ? Math.round((Number(p.count) / total) * 100) : 0;
                return (
                  <div key={p.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{p.method}</span>
                      <span className="text-muted-foreground">{p.count} orders · Rs. {Number(p.revenue).toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "30d Revenue", value: `Rs. ${(month?.totalRevenue || 0).toLocaleString()}` },
          { label: "Avg Order", value: `Rs. ${Math.round(month?.avgOrderValue || 0).toLocaleString()}` },
          { label: "Total Discount", value: `Rs. ${(month?.totalDiscount || 0).toLocaleString()}` },
          { label: "Unpaid Amount", value: `Rs. ${(month?.unpaidAmount || 0).toLocaleString()}`, highlight: true },
        ].map(stat => (
          <Card key={stat.label} className={`border-border/50 ${stat.highlight ? "border-destructive/30 bg-destructive/5" : ""}`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
              <p className={`text-xl font-black tracking-tight ${stat.highlight ? "text-destructive" : ""}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unpaid Orders */}
      {unpaidOrders.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-destructive">Unpaid Orders ({unpaidOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-4">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-sm">{order.id}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.customerName} · {order.paymentMethod}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-sm">Rs. {order.totalAmount.toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{order.orderType}</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-sm"
                      disabled={markingPaid === order.id}
                      onClick={() => handleMarkPaid(order.id)}>
                      {markingPaid === order.id ? "..." : "Mark Paid"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
