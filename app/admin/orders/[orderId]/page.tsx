import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Clock,
  AlertCircle,
  MapPinned,
  UtensilsCrossed,
  UserCircle2,
  Bike,
  Receipt,
  Info,
  Ban
} from "lucide-react";

import { getOrderDetails } from "@/server/actions/order-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PrintInvoiceButton, MarkOrderPaidButton } from "@/components/features/admin/orders/print-invoice-button";

export const dynamic = "force-dynamic";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = await params;
  const { orderId } = resolvedParams;

  const result = await getOrderDetails(orderId);

  if (!result.success || !result.data) {
    return notFound();
  }

  const order = result.data;

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
    preparing: { label: "Preparing", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    out_for_delivery: { label: "Out for Delivery", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    delivered: { label: "Delivered", className: "bg-green-50 text-green-700 border-green-200" },
    cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
    delayed: { label: "Delayed", className: "bg-orange-50 text-orange-700 border-orange-200" },
  };

  const config = statusConfig[order.status] || { label: order.status, className: "bg-muted text-muted-foreground" };
  const isDineIn = order.orderType === "dine_in";

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:m-0 print:p-0 print:space-y-0 print:w-full print:max-w-full">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 pb-4 mb-6 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-none shrink-0 border-border/80 hover:bg-muted/50">
            <Link href="/admin/orders/history">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Order #{order.id.slice(-6)}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : "Unknown Date"}</span>
              <span>•</span>
              <span className="text-foreground">Source: {order.source}</span>
              {order.orderVersion > 1 && (
                <>
                  <span>•</span>
                  <span className="text-blue-600">v{order.orderVersion} (Modified)</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <MarkOrderPaidButton orderId={order.id} paymentStatus={order.paymentStatus} />
          <PrintInvoiceButton order={order} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:w-full">
        {/* ── Left Column (70%) ── */}
        <div className="lg:col-span-8 space-y-6 print:w-full">
          
          {/* Print Only Header (Preserved functionality) */}
          <div className="hidden print:block mb-6 text-center">
            <h2 className="text-2xl font-black">ORDER #{order.id.slice(-6).toUpperCase()}</h2>
            <p className="text-sm">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : ""}</p>
            <p className="text-sm mt-1">{order.orderType?.replace("_", " ").toUpperCase()}</p>
          </div>

          {/* Order Items Table */}
          <Card className="rounded-none shadow-sm print:shadow-none print:border-none print:p-0 print:m-0">
            <CardHeader className="pb-3 border-b border-border/40 print:hidden">
              <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-tight font-black">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 print:p-0">
              <Table className="rounded-none">
                <TableHeader className="bg-muted/30 print:hidden">
                  <TableRow className="border-border/40 hover:bg-muted/30">
                    <TableHead className="w-[60%] font-bold text-xs uppercase tracking-wider text-muted-foreground">Item</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Price</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item: any) => {
                    const isDeal = item.itemName.includes("[DEAL]");
                    const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
                    const dealSelections = isDeal && item.dealSelections ? item.dealSelections : null;

                    return (
                      <TableRow key={item.id} className="border-border/40 hover:bg-transparent print:border-black/20">
                        <TableCell className="py-4 align-top">
                          <div className="font-bold text-sm text-foreground print:text-black flex items-center gap-2">
                            {isDeal ? dealName : item.itemName}
                            {isDeal && <Badge variant="secondary" className="rounded-none text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 border-0">Deal</Badge>}
                          </div>
                          {item.variantName && item.variantName !== "Deal" && item.variantName !== "Combo Deal" && (
                            <div className="text-xs text-muted-foreground font-medium mt-1">
                              {item.variantName}
                            </div>
                          )}
                          
                          {/* Deal selections properly mapped if available in array */}
                          {isDeal && dealSelections && dealSelections.length > 0 && (
                            <div className="text-xs font-semibold mt-2 space-y-1">
                              {dealSelections.map((sel: any, idx: any) => (
                                <div key={idx} className="text-amber-800 bg-amber-50/80 border border-amber-100 px-2 py-1 rounded-none">
                                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900/60 mr-1.5">Slot {idx + 1}</span> {sel.name}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Deal selections from string fallback */}
                          {isDeal && !dealSelections && item.specialInstructions && (
                            <div className="text-xs font-semibold mt-2 space-y-1">
                              {item.specialInstructions.split(" • ").map((itemLine: string, idx: number) => (
                                <div key={idx} className="text-amber-800 bg-amber-50/80 border border-amber-100 px-2 py-1 rounded-none">
                                  {itemLine.trim()}
                                </div>
                              ))}
                            </div>
                          )}

                          {!isDeal && item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 font-medium">
                              + {item.selectedAddOns.map((addon: any) => addon.name).join(", ")}
                            </div>
                          )}

                          {!isDeal && item.specialInstructions && !item.specialInstructions.startsWith("[DEAL:") && (
                            <div className="text-xs text-amber-700 bg-amber-50/50 p-2 mt-2 border border-amber-100 font-medium italic flex items-start gap-1.5">
                                <span>Note: {item.specialInstructions}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm align-top py-4 print:text-black">
                          {item.quantity}x
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground font-semibold align-top py-4 print:text-black">
                          Rs. {Math.round(item.subtotal / item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm align-top py-4 print:text-black">
                          Rs. {item.subtotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="rounded-none shadow-sm print:shadow-none print:border-none print:p-0 print:m-0">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold text-foreground">Rs. {order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="font-medium">Delivery Fee</span>
                  <span className="font-semibold text-foreground">Rs. {order.deliveryFee.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-bold flex items-center gap-2">
                      Discount 
                      {order.couponCode && (
                        <Badge variant="outline" className="rounded-none text-[10px] text-green-700 border-green-200 bg-green-50 px-1.5 py-0 uppercase tracking-wider">
                          {order.couponCode}
                        </Badge>
                      )}
                    </span>
                    <span className="font-bold">- Rs. {order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-4 border-border/40" />
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-wider text-sm">Total Amount</span>
                  <span className="font-black text-2xl tracking-tight">Rs. {order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="hidden print:block mt-8 text-center text-sm font-semibold">
            Thank you for your order!
          </div>
        </div>

        {/* ── Right Column (30%) ── */}
        <div className="lg:col-span-4 space-y-6 print:hidden">

          {/* Alerts */}
          {(order.isWaste || order.voidReason) && (
            <Alert variant="destructive" className="rounded-none border-2">
              <Ban className="h-4 w-4" />
              <AlertTitle className="font-black uppercase text-xs tracking-wider">Order Voided / Waste</AlertTitle>
              <AlertDescription className="text-xs mt-1 font-medium">
                {order.voidReason || "Marked as waste"}
              </AlertDescription>
            </Alert>
          )}

          {(order.delayReason || order.rejectionReason) && (
            <Alert variant="destructive" className="rounded-none bg-red-50 text-red-900 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold text-xs uppercase tracking-wider">
                {order.rejectionReason ? "Order Rejected" : "Order Delayed"}
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 font-medium">
                {order.rejectionReason || order.delayReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Status & Payment */}
          <Card className="rounded-none shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Status & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Order Status</span>
                <Badge variant="outline" className={`rounded-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${config.className}`}>
                  {config.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Payment</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    {order.paymentMethod}
                  </span>
                  <Badge className={
                    order.paymentStatus === "paid" 
                      ? "rounded-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm hover:bg-emerald-600" 
                      : "rounded-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                  }>
                    {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Context */}
          <Card className="rounded-none shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <UserCircle2 className="w-4 h-4" /> Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-none"><User className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="font-bold text-base">{order.customerName || "Walk-in Guest"}</div>
                </div>
                {order.customerPhone && (
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-none"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="font-medium text-muted-foreground">{order.customerPhone}</div>
                  </div>
                )}
                
                {order.orderType === "delivery" && order.deliveryAddress && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 border border-blue-100 p-2 rounded-none shrink-0">
                        <MapPinned className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="leading-relaxed pt-0.5">
                        <span className="block font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Delivery Address
                        </span>
                        <span className="font-semibold text-sm">{order.deliveryAddress}</span>
                        {(order.latitude && order.longitude) && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            <MapPin className="w-3 h-3" /> Coordinates saved
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {order.deliveryNotes && (
                  <div className="bg-amber-50/50 border border-amber-100 p-3 text-xs font-medium italic text-amber-800 shadow-sm">
                    "{order.deliveryNotes}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment Context */}
          <Card className="rounded-none shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4" /> Fulfillment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="block font-bold text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Order Placed</span>
                  <span className="font-semibold">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : "Unknown"}</span>
                  {order.createdAt && <div className="text-[10px] uppercase font-semibold text-muted-foreground mt-1">{formatDistanceToNow(new Date(order.createdAt))} ago</div>}
                </div>
              </div>

              {order.estimatedReadyAt && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <span className="block font-bold text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Estimated Ready</span>
                    <span className="font-bold text-primary">{format(new Date(order.estimatedReadyAt), "h:mm a")}</span>
                  </div>
                </div>
              )}

              {isDineIn ? (
                <>
                  <Separator />
                  <div className="flex items-center gap-3 bg-primary/5 p-3 border border-primary/20">
                    <UtensilsCrossed className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Dine-In Table</div>
                      <div className="font-black text-lg text-primary">Table {order.tableNumber || "N/A"}</div>
                    </div>
                  </div>
                  {order.waiterName && (
                    <div className="flex items-center gap-3 mt-2">
                      <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                      <div className="font-medium text-sm text-muted-foreground">Waiter: <span className="font-bold text-foreground">{order.waiterName}</span></div>
                    </div>
                  )}
                </>
              ) : order.orderType === "delivery" ? (
                <>
                  <Separator />
                  <div className="flex items-center gap-3 bg-indigo-50/50 p-3 border border-indigo-100">
                    <Bike className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Rider Assignment</div>
                      <div className="font-semibold text-sm">{order.riderId ? "Rider Assigned" : "No Rider Assigned"}</div>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

