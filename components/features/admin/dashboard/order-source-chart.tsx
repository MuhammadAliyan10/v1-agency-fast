"use client";

import { Pie, PieChart, Cell } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { OrderSourceData } from "@/types/analytics";

interface OrderSourceChartProps {
  data: OrderSourceData[];
}

const chartConfig = {
  website: {
    label: "Website",
    color: "hsl(var(--chart-1))",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(var(--chart-2))",
  },
  admin: {
    label: "POS / Admin",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function OrderSourceChart({ data }: OrderSourceChartProps) {
  // Format data for Recharts Pie
  const chartData = data.map((item) => ({
    name: item.source,
    value: item.orders,
    fill: chartConfig[item.source as keyof typeof chartConfig]?.color || "hsl(var(--muted))",
  }));

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle>Order Sources</CardTitle>
        <CardDescription>Distribution by platform</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend 
              content={<ChartLegendContent />} 
              className="mt-4" 
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
