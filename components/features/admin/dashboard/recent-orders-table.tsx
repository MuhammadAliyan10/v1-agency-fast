"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
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

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  approved: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  preparing: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  out_for_delivery: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20",
  delivered: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  rejected: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  delayed: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

export function RecentOrdersTable({ data }: RecentOrdersTableProps) {
  const router = useRouter();

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Live Orders</CardTitle>
          <CardDescription>The latest transactions from the storefront.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
            No recent orders to display.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Time</TableHead>
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
                    <Badge variant="outline" className={statusColors[order.status] || ""}>
                      {order.status.replace("_", " ").toUpperCase()}
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
