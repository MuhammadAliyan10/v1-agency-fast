import { db } from "@/database/db";
import { orders } from "@/database/schema";
import { desc, eq, or } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ExceptionsLogPage() {
  const session = await getSession();
  if (!hasPermission(session, "orders", "read")) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to view the Orders Exceptions log.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const exceptions = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
      status: orders.status,
      voidReason: orders.voidReason,
      rejectionReason: orders.rejectionReason,
      isWaste: orders.isWaste,
    })
    .from(orders)
    .where(
      or(
        eq(orders.status, "cancelled"),
        eq(orders.status, "rejected"),
        eq(orders.isWaste, true)
      )
    )
    .orderBy(desc(orders.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Exceptions & Voids Log"
        description="Audit log of all cancelled, rejected, or wasted orders for loss prevention."
      />

      <div className="border border-border">
        <Table className="rounded-none">
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Void / Rejection Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No exceptions found.
                </TableCell>
              </TableRow>
            ) : (
              exceptions.map((order) => {
                const isCancelled = order.status === "cancelled";
                const isRejected = order.status === "rejected";
                const reason = order.voidReason || order.rejectionReason || "No reason provided";

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : "N/A"}
                    </TableCell>
                    <TableCell>Rs. {(order.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isCancelled && <Badge variant="destructive" className="rounded-none">Cancelled</Badge>}
                        {isRejected && <Badge variant="destructive" className="rounded-none">Rejected</Badge>}
                        {order.isWaste && <Badge variant="outline" className="rounded-none border-red-500 text-red-500">Inventory Waste</Badge>}
                        {!isCancelled && !isRejected && !order.isWaste && (
                          <Badge variant="outline" className="rounded-none">{order.status}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{reason}</span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
