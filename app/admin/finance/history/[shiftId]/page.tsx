import { getShiftDetails } from "@/server/actions/shift-history";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ShiftDetailsPage({ params }: { params: Promise<{ shiftId: string }> }) {
  const { shiftId } = await params;
  const result = await getShiftDetails(shiftId);

  if (!result.success || !result.data) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error || "Shift not found."}</AlertDescription>
        </Alert>
        <Link href="/admin/finance/history" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-none">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const { shift, aggregates, orders } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          heading={`Shift: ${shift.id.slice(-8).toUpperCase()}`}
          description={`Opened by ${shift.openedByName || "Unknown"} at ${format(new Date(shift.openedAt), "MMM d, yyyy h:mm a")}`}
        />
        <Link href="/admin/finance/history">
          <Button variant="outline" className="rounded-none">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>
      </div>

      {shift.closedAt && (
        <Alert className="rounded-none bg-muted/50">
          <Clock className="w-4 h-4" />
          <AlertTitle>Shift Closed</AlertTitle>
          <AlertDescription>
            Closed by {shift.closedByName || "Unknown"} on {format(new Date(shift.closedAt), "MMM d, yyyy h:mm a")}.
            {shift.notes && <span className="block mt-2 font-medium">Closing Note: {shift.notes}</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Starting Float</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {(shift.startingFloat || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected vs Actual Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {(shift.actualCash || 0).toLocaleString()}
              <span className="text-sm text-muted-foreground ml-2 font-normal">/ Rs. {(shift.expectedCash || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${shift.variance !== null && shift.variance < 0 ? "text-red-600" : shift.variance !== null && shift.variance > 0 ? "text-green-600" : ""}`}>
              {shift.variance !== null ? (shift.variance > 0 ? "+" : "") + `Rs. ${shift.variance.toLocaleString()}` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Digital Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {aggregates.digitalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-none bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Cash with Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">Rs. {aggregates.cashWithRiders.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-none bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Cash with Waiters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">Rs. {aggregates.cashWithWaiters.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="rounded-none bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Unpaid Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">Rs. {aggregates.unpaidCredit.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-none bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wider">Total Shift Gross Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">Rs. {aggregates.totalGross.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-none bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-green-700 uppercase tracking-wider">Total Orders Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      {(result.data.unpaidDetails.riders.length > 0 || result.data.unpaidDetails.waiters.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {result.data.unpaidDetails.riders.length > 0 && (
            <div className="border border-border">
              <div className="bg-orange-500/10 px-4 py-3 border-b border-border font-bold text-orange-800">
                Pending Rider Cash Collections
              </div>
              <Table className="bg-background">
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Amount Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.unpaidDetails.riders.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.orders.join(", ")}</TableCell>
                      <TableCell className="text-right font-bold text-orange-700">Rs. {r.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {result.data.unpaidDetails.waiters.length > 0 && (
            <div className="border border-border">
              <div className="bg-orange-500/10 px-4 py-3 border-b border-border font-bold text-orange-800">
                Pending Waiter Cash Collections
              </div>
              <Table className="bg-background">
                <TableHeader>
                  <TableRow>
                    <TableHead>Waiter</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Amount Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.unpaidDetails.waiters.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.orders.join(", ")}</TableCell>
                      <TableCell className="text-right font-bold text-orange-700">Rs. {w.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 border border-border">
        <div className="bg-muted px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">Orders Ledger</h3>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="w-4 h-4" />
            Bounded by shift timeline
          </div>
        </div>
        <Table className="rounded-none bg-background">
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders were processed during this shift.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono font-medium">{o.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>{o.createdAt ? format(new Date(o.createdAt), "h:mm a") : "N/A"}</TableCell>
                  <TableCell>{o.customerName || "Walk-in"}</TableCell>
                  <TableCell className="capitalize">{o.orderType.replace("_", " ")}</TableCell>
                  <TableCell className="capitalize">{o.status.replace("_", " ")}</TableCell>
                  <TableCell>{o.paymentMethod || "N/A"}</TableCell>
                  <TableCell className="text-right font-bold">Rs. {o.totalAmount.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
