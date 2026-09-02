// components/features/admin/orders/order-details-sheet.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Printer,
  Phone,
  Bike,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChefHat,
  MapPin,
  Home,
  Store,
  CreditCard,
  Clock,
  MessageCircle,
  PackageCheck,
  Undo2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderStatus } from "@/server/actions/live-orders";
import { STORE_CONSTANTS } from "@/lib/constants";

const ETA_PRESETS = [10, 15, 20, 25, 30, 45];

interface OrderItem {
  id: string;
  itemName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions: string | null;
  selectedAddOns: any;
}

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType?: "delivery" | "pickup";
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  couponCode?: string | null;
  totalAmount: number;
  estimatedReadyAt?: Date | null;
  createdAt: Date | null;
  items: OrderItem[];
  rider: { name: string; phone?: string | null } | null;
}

interface OrderDetailsSheetProps {
  order: OrderData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus, etaMinutes?: number) => Promise<void>;
  onMarkPaid?: (orderId: string) => Promise<void>;
  isUpdating?: boolean;
  availableRiders?: { id: string; name: string; phone?: string | null }[];
  onAssignRider?: (orderId: string, riderId: string) => Promise<{ riderPhone?: string | null; riderName?: string | null }>;
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
  onMarkPaid,
  isUpdating,
  availableRiders = [],
  onAssignRider,
}: OrderDetailsSheetProps) {
  if (!order) return null;

  const isPickup = order.orderType === "pickup";
  let mapsUrl = null;
  if (order.latitude && order.longitude) {
    mapsUrl = `https://maps.google.com/?q=${order.latitude},${order.longitude}`;
  } else if (order.deliveryAddress?.includes("https://www.google.com/maps?q=")) {
    // Extract legacy location URL
    const match = order.deliveryAddress.match(/https:\/\/www\.google\.com\/maps\?q=([^ ]+)/);
    if (match) {
      mapsUrl = `https://maps.google.com/?q=${match[1]}`;
    }
  } else if (order.deliveryAddress && !order.deliveryAddress.includes("[Location Shared]") && !order.deliveryAddress.includes("Pinned Location")) {
    mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`;
  }

  const getUndoStatus = (status: string, isPickup: boolean): OrderStatus | null => {
    switch (status) {
      case "preparing": return "pending";
      case "ready_for_pickup": return "preparing";
      case "out_for_delivery": return "preparing";
      case "delivered": return isPickup ? "ready_for_pickup" : "out_for_delivery";
      default: return null;
    }
  };

  const undoStatus = getUndoStatus(order.status, isPickup);

  const getRiderWhatsAppUrl = (riderName: string, riderPhone: string) => {
    let phone = riderPhone.replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) phone = "92" + phone.substring(1);

    const orderSummary = order.items
      .map((i) => `• ${i.quantity}x ${i.itemName}${i.variantName ? ` (${i.variantName})` : ""}`)
      .join("\n");
      
    const addressSection = isPickup 
      ? "Store Pickup" 
      : (order.deliveryAddress ? `Address: ${order.deliveryAddress}${mapsUrl ? `\nMap: ${mapsUrl}` : ""}` : "");
      
    const msg = `Assalamu Alaikum ${riderName}!\nNew order assigned:\nOrder ID: #${order.id}\nCustomer: ${order.customerName} — ${order.customerPhone}\n${addressSection ? `${addressSection}\n` : ""}Items:\n${orderSummary}\nTotal: Rs. ${order.totalAmount}`;
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleAssignRider = async (riderId: string) => {
    if (!onAssignRider) return;
    const result = await onAssignRider(order.id, riderId);
    if (result?.riderPhone) {
      window.open(getRiderWhatsAppUrl(result.riderName ?? "", result.riderPhone), "_blank");
    }
  };

  const handlePrintKOT = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td class="qty">${item.quantity}x</td>
        <td>
          <span class="bold">${item.itemName}</span>
          ${item.variantName ? `<br><small>Size: ${item.variantName}</small>` : ""}
          ${item.selectedAddOns && Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0 ? `<br><small>+ ${(item.selectedAddOns as any[]).map(a => a.name).join(", ")}</small>` : ""}
          ${item.specialInstructions && !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]")) ? `<br><small class="bold">** ${item.specialInstructions} **</small>` : ""}
        </td>
        <td class="price">Rs. ${item.subtotal}</td>
      </tr>
    `).join("");

    doc.open();
    doc.write(`
      <html>
      <head>
        <title>Receipt #${order.id}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 15px;
            width: 300px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-lg { font-size: 16px; font-weight: bold; }
          .text-xl { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
          .dashed-line { border-top: 1px dashed #000; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
          .mb-1 { margin-bottom: 4px; }
          .mt-1 { margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { text-align: left; vertical-align: top; padding-bottom: 6px; }
          .qty { width: 25px; font-weight: bold; }
          .price { width: 65px; text-align: right; }
          .type-badge {
            border: 2px solid #000;
            padding: 4px 8px;
            display: inline-block;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="text-xl">CLASSY CRAVE</div>
          <div>PREMIUM FAST FOOD</div>
        </div>
        
        <div class="text-center">
          <div class="type-badge">${isPickup ? "SELF PICKUP" : "DELIVERY"}</div>
        </div>

        <div class="dashed-line"></div>
        <div class="flex-between">
          <span>Order: <b>#${order.id.slice(-6).toUpperCase()}</b></span>
          <span>${format(new Date(), "dd/MM/yy HH:mm")}</span>
        </div>
        <div class="dashed-line"></div>

        <table>
          ${itemsHtml}
        </table>

        <div class="dashed-line"></div>
        <div class="flex-between">
          <span>Subtotal</span>
          <span>Rs. ${order.subtotal}</span>
        </div>
        <div class="flex-between">
          <span>Delivery Fee</span>
          <span>Rs. ${order.deliveryFee}</span>
        </div>
        ${order.discountAmount > 0 ? `
        <div class="flex-between">
          <span>Discount ${order.couponCode ? `(${order.couponCode})` : ""}</span>
          <span>- Rs. ${order.discountAmount}</span>
        </div>
        ` : ""}
        
        <div class="dashed-line"></div>
        <div class="flex-between text-lg">
          <span>TOTAL</span>
          <span>Rs. ${order.totalAmount}</span>
        </div>
        <div class="dashed-line"></div>

        <div class="bold mb-1">CUSTOMER DETAILS:</div>
        <div>${order.customerName}</div>
        <div>${order.customerPhone}</div>
        ${order.deliveryAddress && !isPickup ? `<div class="mt-1">${order.deliveryAddress}</div>` : ""}
        ${order.deliveryNotes ? `<div class="mt-1 bold">NOTE: ${order.deliveryNotes}</div>` : ""}
        
        <div class="dashed-line"></div>
        <div class="text-center mt-1">
          <div class="text-lg">*** ${order.paymentMethod} ***</div>
          <div class="bold">${order.paymentStatus.toUpperCase()}</div>
        </div>
        <div class="dashed-line"></div>
        <div class="text-center mt-1">
          <div>Thank you for choosing</div>
          <div class="bold">Classy Crave!</div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    
    // Slight delay to ensure fonts and layout are rendered before printing
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Remove iframe after print dialog opens
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 200);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0">
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            <SheetHeader className="p-6 pb-4 border-b shrink-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl font-bold">Order #{order.id}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border  ${
                        isPickup
                          ? "border-purple-300 bg-purple-50 text-purple-700"
                          : "border-blue-300 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {isPickup ? <><Store className="w-3 h-3" /> Pickup</> : <><Home className="w-3 h-3" /> Delivery</>}
                    </span>
                    {order.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border border-green-300 bg-green-50 text-green-700">
                        <CreditCard className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border border-orange-300 bg-orange-50 text-orange-700">
                        <CreditCard className="w-3 h-3" /> Unpaid
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={handlePrintKOT} title="Print Kitchen Order Ticket (KOT)">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                <span>Placed: {order.createdAt ? format(new Date(order.createdAt), "dd MMM, hh:mm a") : "N/A"}</span>
                {order.estimatedReadyAt && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <Clock className="w-3 h-3" />
                    ETA: {format(new Date(order.estimatedReadyAt), "hh:mm a")}
                  </span>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-indigo-500/80 [&::-webkit-scrollbar-thumb]: hover:[&::-webkit-scrollbar-thumb]:bg-indigo-600">
                {/* Customer Info */}
                <section>
                  <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground tracking-wider">Customer</h3>
                  <div className="bg-muted/40 p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{order.customerName}</span>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Phone className="h-3 w-3" />
                        {order.customerPhone}
                      </a>
                    </div>
                    {isPickup ? (
                      <p className="text-purple-700 font-medium text-xs bg-purple-50 px-2 py-1 rounded">
                        🏪 Self Pickup — will collect at store
                      </p>
                    ) : (
                      <>
                        {order.deliveryAddress && (
                          <p className="text-muted-foreground break-words">{order.deliveryAddress}</p>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            <MapPin className="w-3 h-3" /> Open in Google Maps
                          </a>
                        )}
                      </>
                    )}
                    {order.deliveryNotes && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-700 dark:text-yellow-500 text-xs">
                        <strong>Note:</strong> {order.deliveryNotes}
                      </div>
                    )}
                  </div>
                </section>

                {/* Rider Assignment */}
                {(order.status === "preparing" || order.status === "out_for_delivery" || order.status === "approved") && !isPickup && (
                  <section>
                    <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground tracking-wider">Rider</h3>
                    <div className="bg-muted/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {order.rider ? (
                            <>
                              <p className="font-semibold text-sm">{order.rider.name}</p>
                              {order.rider.phone && (
                                <a href={`tel:${order.rider.phone}`} className="text-xs text-primary hover:underline">
                                  {order.rider.phone}
                                </a>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No rider assigned</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {order.rider?.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 shrink-0"
                              onClick={() => {
                                window.open(getRiderWhatsAppUrl(order.rider!.name, order.rider!.phone ?? ""), "_blank");
                              }}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </Button>
                          )}
                          {onAssignRider && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2" disabled={isUpdating}>
                                  <Bike className="w-3.5 h-3.5" />
                                  {order.rider ? "Change" : "Assign"}
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[200px]">
                                {availableRiders.length === 0 ? (
                                  <div className="p-2 text-xs text-muted-foreground text-center">No active riders</div>
                                ) : (
                                  availableRiders.map((rider) => (
                                    <DropdownMenuItem
                                      key={rider.id}
                                      onClick={() => handleAssignRider(rider.id)}
                                    >
                                      {rider.name}
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Order Items */}
                <section>
                  <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">
                    Items ({order.items.length})
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between font-semibold text-sm">
                          <span>
                            {item.quantity}× {item.itemName}
                          </span>
                          <span>Rs. {item.subtotal.toLocaleString()}</span>
                        </div>
                        {item.variantName && (
                          <span className="text-xs text-muted-foreground ml-4">Size: {item.variantName}</span>
                        )}
                        {item.selectedAddOns &&
                          Array.isArray(item.selectedAddOns) &&
                          item.selectedAddOns.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-4">
                              + {(item.selectedAddOns as any[]).map((a: any) => a.name).join(", ")}
                            </span>
                          )}
                        {item.specialInstructions && !(item.specialInstructions.startsWith("[DEAL:") && item.specialInstructions.endsWith("]")) && (
                          <div className="mt-1 ml-4 text-xs p-1.5 bg-amber-500/10 text-amber-700 rounded border border-amber-500/20 inline-block font-semibold">
                            ⚠️ {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />

                {/* Payment */}
                <section className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>Rs. {order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>Rs. {order.deliveryFee.toLocaleString()}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                      <span>− Rs. {order.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>Rs. {order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <Badge variant="outline">{order.paymentMethod}</Badge>
                    <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                      {order.paymentStatus.toUpperCase()}
                    </Badge>
                    {order.paymentStatus !== "paid" && onMarkPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => onMarkPaid(order.id)}
                        disabled={isUpdating}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </section>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t bg-muted/20 flex flex-col gap-2 shrink-0 bg-background z-10">
              {(order.status === "pending" || order.status === "approved") && (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, "preparing");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                  Start Preparing
                </Button>
              )}
              {order.status === "preparing" && isPickup && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, "ready_for_pickup");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                  Mark Ready for Pickup
                </Button>
              )}
              {order.status === "preparing" && !isPickup && (
                <Button
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, "out_for_delivery");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bike className="mr-2 h-4 w-4" />}
                  Send Out for Delivery
                </Button>
              )}
              {order.status === "ready_for_pickup" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, "delivered");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Mark as Collected
                </Button>
              )}
              {order.status === "out_for_delivery" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, "delivered");
                  }}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Mark as Delivered
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {undoStatus && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground text-xs mt-1"
                  disabled={isUpdating}
                  onClick={() => {
                    onOpenChange(false);
                    onUpdateStatus?.(order.id, undoStatus);
                  }}
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                  Undo status to {undoStatus.replace(/_/g, " ")}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
