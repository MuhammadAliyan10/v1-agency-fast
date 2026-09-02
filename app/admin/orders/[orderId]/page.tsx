import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, MapPin, Phone, User, Clock, AlertCircle, MapPinned, UtensilsCrossed, UserCircle2, Bike, Receipt, Banknote } from "lucide-react";

import { getOrderDetails } from "@/server/actions/order-history";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PrintInvoiceButton } from "@/components/features/admin/orders/print-invoice-button";

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
    pending:          { label: "Pending",         className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved:         { label: "Approved",        className: "bg-blue-50 text-blue-700 border-blue-200" },
    preparing:        { label: "Preparing",       className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    out_for_delivery: { label: "Out for Delivery",className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    delivered:        { label: "Delivered",       className: "bg-green-50 text-green-700 border-green-200" },
    cancelled:        { label: "Cancelled",       className: "bg-red-50 text-red-700 border-red-200" },
    rejected:         { label: "Rejected",        className: "bg-red-50 text-red-700 border-red-200" },
    delayed:          { label: "Delayed",         className: "bg-orange-50 text-orange-700 border-orange-200" },
  };

  const config = statusConfig[order.status] || { label: order.status, className: "bg-muted text-muted-foreground" };

  const isDineIn = order.orderType === "dine_in";

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto print:m-0 print:p-0 print:space-y-0 print:w-full print:max-w-full">
      {/* Navigation & Actions (Hidden in Print) */}
      <div className="flex items-start gap-4 mb-8 print:hidden">
        <Button variant="outline" size="icon" asChild className="mt-1 shrink-0 border-border/80 hover:bg-muted/50">
          <Link href="/admin/orders/history">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 flex justify-between items-start">
          <PageHeader 
            heading={`Order #${order.id.slice(-6).toUpperCase()}`} 
            description="Comprehensive order details and history." 
            className="mb-0"
          />
          <PrintInvoiceButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 print:block print:w-full">
        
        {/* Main Content (Order Items / Receipt) */}
        <div className="lg:col-span-8 space-y-8 print:w-full">
          <div className="print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent">
            
            <div className="hidden print:block mb-6 text-center">
              <h2 className="text-2xl font-black">ORDER #{order.id.slice(-6).toUpperCase()}</h2>
              <p className="text-sm">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : ""}</p>
              <p className="text-sm mt-1">{order.orderType?.replace("_", " ").toUpperCase()}</p>
            </div>

            <div className="flex justify-between items-end border-b-2 border-border/80 pb-4 mb-6 print:hidden">
              <h3 className="text-2xl font-heading font-black flex items-center gap-2">
                <Receipt className="w-6 h-6 text-muted-foreground" /> Order Items
              </h3>
              <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wider">Qty & Price</span>
            </div>
            
            <div className="space-y-6">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start border-b border-border/40 pb-5 last:border-0 last:pb-0 print:border-black/20">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-muted-foreground print:text-black">{item.quantity}x</span>
                      <span className="font-bold text-lg print:text-black">{item.itemName}</span>
                    </div>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground print:text-black/70 mt-1 ml-6">{item.variantName}</p>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-sm text-muted-foreground print:text-black/70 mt-1 ml-6">
                        + {item.selectedAddOns.map((addon: any) => addon.name).join(", ")}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <p className="text-sm text-amber-600 bg-amber-50 print:bg-transparent print:border print:border-black/20 p-2 mt-2 ml-6 italic">
                        "Note: {item.specialInstructions}"
                      </p>
                    )}
                  </div>
                  <div className="font-bold text-lg print:text-black">
                    Rs. {item.subtotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-8 opacity-50 print:border-black/40 print:my-4" />

            <div className="space-y-4 print:text-black">
              <div className="flex justify-between text-muted-foreground print:text-black text-lg">
                <span>Subtotal</span>
                <span className="font-medium text-foreground print:text-black">Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground print:text-black text-lg">
                <span>Delivery Fee</span>
                <span className="font-medium text-foreground print:text-black">Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600 print:text-black text-lg">
                  <span>Discount</span>
                  <span className="font-bold">- Rs. {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black font-heading text-2xl pt-5 border-t border-border/40 print:border-black/40 mt-2">
                <span>Total Amount</span>
                <span>Rs. {order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="hidden print:block mt-8 text-center text-sm font-semibold">
              Thank you for your order!
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-12 print:hidden">
          
          {/* Status & Financial Section */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5 border-b border-border/60 pb-3">Status & Payment</h3>
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`px-3 py-1 text-sm font-bold shadow-sm ${config.className}`}>
                  {config.label}
                </Badge>
                <Badge className={
                  order.paymentStatus === "paid" 
                    ? "px-3 py-1 text-sm font-bold bg-emerald-500 text-white border-0 shadow-sm" 
                    : "px-3 py-1 text-sm font-bold bg-rose-500 text-white border-0 shadow-sm"
                }>
                  {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 text-muted-foreground">
                <Clock className="w-5 h-5 shrink-0 text-muted-foreground/70" />
                <div className="flex flex-col">
                  <span className="mt-0.5 leading-snug font-semibold text-foreground">
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown Date"}
                  </span>
                  {order.createdAt && (
                    <span className="text-xs opacity-80">{formatDistanceToNow(new Date(order.createdAt))} ago</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <Banknote className="w-5 h-5 shrink-0 text-muted-foreground/70" />
                <span className="mt-0.5 leading-snug">Method: <strong className="text-foreground uppercase">{order.paymentMethod || "N/A"}</strong></span>
              </div>
            </div>

            {(order.delayReason || order.rejectionReason) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold block">{order.rejectionReason ? "Rejection Reason:" : "Delay Reason:"}</span>
                    {order.rejectionReason || order.delayReason}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Context-Aware Customer Info */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5 border-b border-border/60 pb-3 flex items-center gap-2">
              <UserCircle2 className="w-4 h-4" /> Customer Context
            </h3>
            
            {isDineIn ? (
              <div className="space-y-5 text-sm">
                <div className="flex items-center gap-3 bg-primary/5 p-4 border border-primary/20">
                  <div className="bg-primary/10 p-2.5"><UtensilsCrossed className="w-5 h-5 text-primary" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Dine-In Table</div>
                    <div className="font-black text-xl text-primary">Table {order.tableNumber || "N/A"}</div>
                  </div>
                </div>
                {order.customerName && (
                  <>
                    <Separator className="opacity-50" />
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2"><User className="w-4 h-4 text-muted-foreground" /></div>
                      <div className="font-bold text-base">{order.customerName}</div>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                        <div className="font-medium">{order.customerPhone}</div>
                      </div>
                    )}
                  </>
                )}
                {order.waiterName && (
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2"><UserCircle2 className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="font-medium text-muted-foreground">Waiter: <span className="text-foreground font-semibold">{order.waiterName}</span></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 text-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2"><User className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="font-bold text-base">{order.customerName || "Walk-in Guest"}</div>
                </div>
                {order.customerPhone && (
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="font-medium">{order.customerPhone}</div>
                  </div>
                )}
                
                {order.orderType === "delivery" && order.deliveryAddress && (
                  <>
                    <Separator className="opacity-50" />
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-2 mt-0.5"><MapPinned className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /></div>
                      <div className="leading-relaxed text-muted-foreground pt-1">
                        <span className="block font-semibold text-foreground text-xs uppercase mb-0.5">Delivery Address</span>
                        {order.deliveryAddress}
                      </div>
                    </div>
                  </>
                )}
                
                {order.deliveryNotes && (
                  <div className="bg-amber-50/50 border border-amber-100 p-4 italic text-amber-800 shadow-sm">
                    "Note: {order.deliveryNotes}"
                  </div>
                )}

                {order.orderType === "delivery" && (
                  <>
                    <Separator className="opacity-50" />
                    <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 border border-indigo-100 dark:border-indigo-900/30">
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2"><Bike className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                      <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Rider Assignment</div>
                        <div className="font-semibold text-sm">{order.riderId ? "Rider Assigned" : "No Rider Assigned"}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
