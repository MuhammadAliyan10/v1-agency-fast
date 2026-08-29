import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Phone, User, Clock, CheckCircle2, AlertCircle } from "lucide-react";

import { getOrderDetails } from "@/server/actions/order-history";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation */}
      <div className="flex items-start gap-4 mb-8">
        <Button variant="outline" size="icon" asChild className="rounded-full mt-1 shrink-0 border-border/80 hover:bg-muted/50">
          <Link href="/admin/orders/history">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader 
            heading={`Order #${order.id.replace('CC-', '')}`} 
            description="Comprehensive order details and history." 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* Main Content (Order Items) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl p-8 shadow-sm border border-border/60">
            <h3 className="text-xl font-heading font-black mb-6">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start border-b border-border/40 pb-5 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-muted-foreground">{item.quantity}x</span>
                      <span className="font-bold text-lg">{item.itemName}</span>
                    </div>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6">{item.variantName}</p>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-sm text-muted-foreground mt-1 ml-6">
                        + {item.selectedAddOns.map((addon: any) => addon.name).join(", ")}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <p className="text-sm text-amber-600 bg-amber-50 rounded-md p-2 mt-2 ml-6 italic">
                        "Note: {item.specialInstructions}"
                      </p>
                    )}
                  </div>
                  <div className="font-bold text-lg">
                    Rs. {item.subtotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-8 opacity-50" />

            <div className="space-y-4">
              <div className="flex justify-between text-muted-foreground text-lg">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-lg">
                <span>Delivery Fee</span>
                <span className="font-medium text-foreground">Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-lg">
                  <span>Discount</span>
                  <span className="font-bold">- Rs. {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black font-heading text-2xl pt-5 border-t border-border/40 mt-2">
                <span>Total Amount</span>
                <span>Rs. {order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6 md:space-y-8">
          
          {/* Status Card */}
          <div className="bg-card rounded-3xl p-7 shadow-sm border border-border/60">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Order Status</h3>
            <div className="flex items-center gap-3 mb-5">
              <Badge variant="outline" className={`px-4 py-1.5 text-sm font-semibold shadow-sm ${config.className}`}>
                {config.label}
              </Badge>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 text-muted-foreground">
                <Clock className="w-5 h-5 shrink-0 text-muted-foreground/70" />
                <span className="mt-0.5 leading-snug">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown Date"}</span>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-muted-foreground/70" />
                <span className="mt-0.5 leading-snug">Payment: <strong className="text-foreground">{order.paymentMethod}</strong> ({order.paymentStatus})</span>
              </div>
            </div>

            {(order.delayReason || order.rejectionReason) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
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

          {/* Customer Info */}
          <div className="bg-card rounded-3xl p-7 shadow-sm border border-border/60">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5">Customer Details</h3>
            <div className="space-y-5 text-sm">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><User className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <div className="font-bold text-base">{order.customerName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                <div className="font-medium">{order.customerPhone}</div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-start gap-3">
                <div className="bg-muted p-2 rounded-full mt-0.5"><MapPin className="w-4 h-4 text-muted-foreground shrink-0" /></div>
                <div className="leading-relaxed text-muted-foreground pt-1">
                  {order.deliveryAddress}
                </div>
              </div>
              {order.deliveryNotes && (
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl italic text-amber-800 shadow-sm">
                  "Note: {order.deliveryNotes}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
