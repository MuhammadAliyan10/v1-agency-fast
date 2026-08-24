"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WeeklyRevenuePoint } from "@/types/analytics";

interface RevenueChartProps {
  data: WeeklyRevenuePoint[];
}

const chartConfig = {
  revenue: {
    label: "Revenue (Rs.)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function RevenueChart({ data }: RevenueChartProps) {
  // Calculate trend
  let trendMsg = "Stable revenue";
  if (data.length >= 2) {
    const last = data[data.length - 1].revenue;
    const prev = data[data.length - 2].revenue;
    if (last > prev) {
      const pct = ((last - prev) / (prev || 1)) * 100;
      trendMsg = `Trending up by ${pct.toFixed(1)}% vs yesterday`;
    } else if (last < prev) {
      const pct = ((prev - last) / (prev || 1)) * 100;
      trendMsg = `Trending down by ${pct.toFixed(1)}% vs yesterday`;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>7-Day Revenue Trend</CardTitle>
        <CardDescription>
          Showing total daily revenue for the past 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 0,
              top: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              className="text-xs text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => `Rs. ${value}`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={80}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="var(--color-revenue)"
              fillOpacity={0.2}
              stroke="var(--color-revenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <div className="flex items-center gap-2 px-6 pb-6 text-sm font-medium leading-none">
        {trendMsg.includes("up") && <TrendingUp className="h-4 w-4 text-green-500" />}
        {trendMsg}
      </div>
    </Card>
  );
}
