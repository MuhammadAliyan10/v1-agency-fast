"use client";

import { AlertTriangle, PackageOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LowStockAlert } from "@/types/analytics";

interface LowStockWidgetProps {
  data: LowStockAlert[];
}

export function LowStockWidget({ data }: LowStockWidgetProps) {
  return (
    <Card className="h-full flex flex-col shadow-sm border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Inventory Alerts
        </CardTitle>
        <CardDescription className="text-xs">
          Low stock & unavailable items
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Inventory is healthy</p>
            <p className="text-xs text-muted-foreground/70 mt-1">No items are running low.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => {
              const is86d = !item.isAvailable;
              return (
                <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {is86d ? "Marked as unavailable" : `${item.stockQuantity} ${item.unit} remaining`}
                    </span>
                  </div>
                  <Badge 
                    variant={is86d ? "destructive" : "outline"}
                    className={!is86d ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" : ""}
                  >
                    {is86d ? "86'd (Disabled)" : "Low Stock"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
