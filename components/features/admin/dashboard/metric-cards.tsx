import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, AlertCircle } from "lucide-react";
import type { DashboardKPIs } from "@/types/analytics";

interface MetricCardsProps {
  data: DashboardKPIs;
}

export function MetricCards({ data }: MetricCardsProps) {
  const isPositive = data.revenueComparison >= 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rs. {data.todayRevenue.toLocaleString()}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isPositive ? "default" : "destructive"} className={isPositive ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : ""}>
              {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {Math.abs(data.revenueComparison).toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground">vs yesterday</p>
          </div>
        </CardContent>
      </Card>

      {/* Orders Count Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.todayOrdersCount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Total orders placed today</p>
        </CardContent>
      </Card>

      {/* Average Order Value Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Ticket Size</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rs. {data.averageOrderValue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Average spend per order</p>
        </CardContent>
      </Card>

      {/* Pending Orders Alert Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingOrdersCount}</div>
          <div className="flex items-center gap-2 mt-1">
            {data.pendingOrdersCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                <p className="text-xs text-orange-500 font-medium">Requires attention</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Kitchen is clear</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
