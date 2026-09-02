import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TopSellingItem } from "@/types/analytics";

interface TopSellingWidgetProps {
  data: TopSellingItem[];
}

export function TopSellingWidget({ data }: TopSellingWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Selling Items</CardTitle>
        <CardDescription>Most popular menu items by volume.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sales data available.</p>
          ) : (
            data.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.categoryName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.totalSold} sold</p>
                  <p className="text-xs text-muted-foreground mt-1">Rs. {item.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
