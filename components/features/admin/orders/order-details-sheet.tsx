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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [etaDialogOpen, setEtaDialogOpen] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [customEta, setCustomEta] = useState("");

  if (!order) return null;

  const isPickup = order.orderType === "pickup";
  const mapsUrl =
    order.latitude && order.longitude
      ? `https://maps.google.com/?q=${order.latitude},${order.longitude}`
      : order.deliveryAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`
      : null;

  const handleStartPreparing = () => {
    setEtaMinutes(20);
    setCustomEta("");
    setEtaDialogOpen(true);
  };

  const handleConfirmEta = async () => {
    const finalEta = customEta ? parseInt(customEta) : etaMinutes;
    setEtaDialogOpen(false);
    await onUpdateStatus?.(order.id, "preparing", finalEta > 0 ? finalEta : undefined);
  };

  const handleAssignRider = async (riderId: string) => {
    if (!onAssignRider) return;
    const result = await onAssignRider(order.id, riderId);
    if (result?.riderPhone) {
      const orderSummary = order.items
        .map((i) => `• ${i.quantity}x ${i.itemName}${i.variantName ? ` (${i.variantName})` : ""}`)
        .join("%0a");
      const address = isPickup ? "Store Pickup" : (order.deliveryAddress || "");
      const msg = `Assalamu Alaikum ${result.riderName ?? ""}!%0aNew order assigned:%0aOrder ID: #${order.id}%0aCustomer: ${order.customerName} — ${order.customerPhone}%0a${address ? `Address: ${address}%0a` : ""}Items:%0a${orderSummary}%0aTotal: Rs. ${order.totalAmount}`;
      const phone = result.riderPhone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    }
  };

  const handlePrintKOT = () => {
    const kot = document.getElementById(`kot-${order.id}`);
    if (!kot) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html><head><title>KOT #${order.id}</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 10px; }
        h2 { text-align:center; margin:0; font-size:16px; }
        .center { text-align:center; }
        .dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .item { margin: 6px 0; }
        .item-qty { font-size:20px; font-weight:bold; }
        .badge { background:#000; color:#fff; padding:2px 6px; font-size:11px; display:inline-block; }
        @media print { @page { margin: 5mm; } }
      </style>
      </head><body onload="window.print()">
      <h2>KITCHEN ORDER</h2>
      <p class="center" style="margin:2px 0">Order #${order.id}</p>
      <p class="center" style="margin:2px 0; font-size:11px">${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
      <div class="dashed"></div>
      <div class="row"><span><b>${isPickup ? "🏪 PICKUP" : "🚴 DELIVERY"}</b></span><span><b>${order.orderType?.toUpperCase()}</b></span></div>
      <div class="dashed"></div>
      ${order.items
        .map(
          (item) => `
          <div class="item">
            <span class="item-qty">${item.quantity}x</span> <b>${item.itemName}</b>${item.variantName ? ` <em>(${item.variantName})</em>` : ""}
            ${item.selectedAddOns && Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0 ? `<br><small>+ ${(item.selectedAddOns as any[]).map((a: any) => a.name).join(", ")}</small>` : ""}
            ${item.specialInstructions ? `<br><span style="background:#ffe500;padding:1px 4px;font-weight:bold;">⚠️ ${item.specialInstructions}</span>` : ""}
          </div>`
        )
        .join("")}
      <div class="dashed"></div>
      ${order.deliveryNotes ? `<p><b>Note:</b> ${order.deliveryNotes}</p>` : ""}
      ${!isPickup && order.deliveryAddress ? `<p><b>Deliver to:</b> ${order.deliveryAddress}</p>` : ""}
      <p class="center"><b>${order.customerName}</b> | ${order.customerPhone}</p>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-6 pb-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl font-bold">Order #{order.id}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border rounded-sm ${
                        isPickup
                          ? "border-purple-300 bg-purple-50 text-purple-700"
                          : "border-blue-300 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {isPickup ? <><Store className="w-3 h-3" /> Pickup</> : <><Home className="w-3 h-3" /> Delivery</>}
                    </span>
                    {order.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border border-green-300 bg-green-50 text-green-700 rounded-sm">
                        <CreditCard className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border border-orange-300 bg-orange-50 text-orange-700 rounded-sm">
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

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <section>
                  <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground tracking-wider">Customer</h3>
                  <div className="bg-muted/40 p-4 rounded-lg space-y-2 text-sm">
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
                    <div className="bg-muted/40 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
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
                              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => {
                                const phone = (order.rider!.phone ?? "").replace(/[^0-9]/g, "");
                                window.open(`https://wa.me/${phone}`, "_blank");
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
                        {item.specialInstructions && (
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
                        className="h-6 text-xs rounded-sm px-2 border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => onMarkPaid(order.id)}
                        disabled={isUpdating}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </section>
              </div>
            </ScrollArea>

            {/* Action Footer */}
            <div className="p-4 border-t bg-muted/20 flex flex-col gap-2 shrink-0">
              {(order.status === "pending" || order.status === "approved") && (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  size="lg"
                  disabled={isUpdating}
                  onClick={handleStartPreparing}
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
                  onClick={() => onUpdateStatus?.(order.id, "ready_for_pickup")}
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
                  onClick={() => onUpdateStatus?.(order.id, "out_for_delivery")}
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
                  onClick={() => onUpdateStatus?.(order.id, "delivered")}
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
                  onClick={() => onUpdateStatus?.(order.id, "delivered")}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Mark as Delivered
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ETA Dialog */}
      <Dialog open={etaDialogOpen} onOpenChange={setEtaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Set Estimated Time
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              How long will this order take to be ready? This will be shown to the customer on their tracking page.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ETA_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => { setEtaMinutes(mins); setCustomEta(""); }}
                  className={`py-2.5 text-sm font-bold rounded-lg border transition-all ${
                    etaMinutes === mins && !customEta
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted hover:bg-muted/50"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Custom (minutes)</Label>
              <Input
                type="number"
                placeholder="e.g. 35"
                value={customEta}
                onChange={(e) => { setCustomEta(e.target.value); setEtaMinutes(0); }}
                min={1}
                max={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtaDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEta}
              className="gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Start Preparing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
