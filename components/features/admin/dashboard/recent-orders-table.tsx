"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ShoppingBag } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecentOrderSummary } from "@/types/analytics";

interface RecentOrdersTableProps {
  data: RecentOrderSummary[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:          { label: "Pending",         className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
  approved:         { label: "Approved",        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  preparing:        { label: "Preparing",       className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400" },
  out_for_delivery: { label: "Out for Delivery",className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400" },
  delivered:        { label: "Delivered",       className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" },
  cancelled:        { label: "Cancelled",       className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
  rejected:         { label: "Rejected",        className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
  delayed:          { label: "Delayed",         className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400" },
};

export function RecentOrdersTable({ data }: RecentOrdersTableProps) {
  const router = useRouter();

  return (
    <Card className="col-span-full xl:col-span-2 border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          <CardDescription className="text-xs mt-0.5">Latest transactions from the storefront</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")} className="text-xs gap-1.5">
          View All Live Orders
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No orders yet today</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Orders placed by customers will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/orders?id=${order.id}`)}
                >
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{order.customerName}</span>
                      <span className="text-xs text-muted-foreground">{order.itemsCount} items</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[order.status]?.className || ""}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    Rs. {order.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
