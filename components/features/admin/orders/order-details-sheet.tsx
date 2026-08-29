"use client";

import { format } from "date-fns";
import { Printer, Phone, X, Bike, CheckCircle2, Loader2, ChevronDown, ChefHat } from "lucide-react";
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
import type { OrderStatus } from "@/server/actions/live-orders";

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
  deliveryAddress: string;
  deliveryNotes: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: Date | null;
  items: OrderItem[];
  rider: { name: string; phone?: string } | null;
}

interface OrderDetailsSheetProps {
  order: OrderData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => Promise<void>;
  isUpdating?: boolean;
  availableRiders?: { id: string; name: string }[];
  onAssignRider?: (orderId: string, riderId: string) => Promise<void>;
}

export function OrderDetailsSheet({ 
  order, 
  open, 
  onOpenChange,
  onUpdateStatus,
  isUpdating,
  availableRiders = [],
  onAssignRider
}: OrderDetailsSheetProps) {
  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col sm:max-w-md">
        <div className="kanban-board h-full flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-bold">Order #{order.id}</SheetTitle>
              <Button size="icon" variant="outline" onClick={() => window.print()} title="Print Receipt">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Placed at: {order.createdAt ? format(new Date(order.createdAt), "PP pp") : "N/A"}
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <section>
                <h3 className="font-semibold mb-2">Customer Details</h3>
                <div className="bg-muted/40 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{order.customerName}</span>
                    <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {order.customerPhone}
                    </a>
                  </div>
                  <p className="text-muted-foreground break-words">{order.deliveryAddress}</p>
                  {order.deliveryNotes && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-700 dark:text-yellow-500">
                      <strong>Note:</strong> {order.deliveryNotes}
                    </div>
                  )}
                </div>
              </section>

              {/* Status and Rider Assignment */}
              <section>
                <h3 className="font-semibold mb-3">Delivery & Status</h3>
                <div className="bg-muted/40 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Order Status</span>
                    <Badge variant="outline" className="capitalize">{order.status.replace("_", " ")}</Badge>
                  </div>
                  
                  {(order.status === "preparing" || order.status === "out_for_delivery") && (
                    <div className="flex items-center justify-between border-t border-border/50 pt-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Assigned Rider</span>
                        {order.rider ? (
                          <span className="text-xs text-muted-foreground">{order.rider.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </div>
                      
                      {onAssignRider && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2" disabled={isUpdating}>
                              {order.rider ? "Change Rider" : "Assign Rider"}
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            {availableRiders.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground text-center">No active riders</div>
                            ) : (
                              availableRiders.map((rider) => (
                                <DropdownMenuItem 
                                  key={rider.id}
                                  onClick={() => onAssignRider(order.id, rider.id)}
                                >
                                  {rider.name}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Order Items */}
              <section>
                <h3 className="font-semibold mb-3">Order Items ({order.items.length})</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between font-medium">
                        <span>{item.quantity}x {item.itemName}</span>
                        <span>Rs. {item.subtotal.toLocaleString()}</span>
                      </div>
                      {item.variantName && (
                        <span className="text-sm text-muted-foreground ml-5">- {item.variantName}</span>
                      )}
                      {item.specialInstructions && (
                        <div className="mt-1 ml-5 text-xs p-1.5 bg-red-500/10 text-red-600 rounded border border-red-500/20 inline-block font-medium">
                          Instructions: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              
              <Separator />

              {/* Payment Info */}
              <section className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs. {order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>Rs. {order.deliveryFee.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>- Rs. {order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>Rs. {order.totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline">{order.paymentMethod}</Badge>
                  <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                    {order.paymentStatus.toUpperCase()}
                  </Badge>
                </div>
              </section>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/20 flex flex-col gap-3">
            {order.status === "pending" || order.status === "approved" ? (
              <Button 
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold" 
                size="lg"
                disabled={isUpdating}
                onClick={() => onUpdateStatus?.(order.id, "preparing")}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                Start Preparing
              </Button>
            ) : order.status === "preparing" ? (
              <Button 
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" 
                size="lg"
                disabled={isUpdating}
                onClick={() => onUpdateStatus?.(order.id, "out_for_delivery")}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bike className="mr-2 h-4 w-4" />}
                Send Out for Delivery
              </Button>
            ) : order.status === "out_for_delivery" ? (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" 
                size="lg"
                disabled={isUpdating}
                onClick={() => onUpdateStatus?.(order.id, "delivered")}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Mark as Delivered
              </Button>
            ) : null}
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close Details
            </Button>
          </div>
        </div>

        {/* PRINT ONLY TEMPLATE (Hidden from screen UI) */}
        <div className="print-receipt-container hidden">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>CLASSY CRAVE</h2>
            <p style={{ margin: '0', fontSize: '12px' }}>Order #{order.id}</p>
            <p style={{ margin: '0', fontSize: '12px' }}>{order.createdAt ? format(new Date(order.createdAt), "PP pp") : "N/A"}</p>
          </div>
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', margin: '10px 0' }}>
            <p style={{ margin: '2px 0' }}><strong>Customer:</strong> {order.customerName}</p>
            <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {order.customerPhone}</p>
            <p style={{ margin: '2px 0' }}><strong>Address:</strong> {order.deliveryAddress}</p>
            {order.deliveryNotes && <p style={{ margin: '2px 0' }}><strong>Notes:</strong> {order.deliveryNotes}</p>}
          </div>
          <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', marginBottom: '10px' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px dashed #000', paddingBottom: '3px' }}>Qty</th>
                <th style={{ borderBottom: '1px dashed #000', paddingBottom: '3px' }}>Item</th>
                <th style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ verticalAlign: 'top', paddingTop: '3px' }}>{item.quantity}</td>
                  <td style={{ verticalAlign: 'top', paddingTop: '3px' }}>
                    {item.itemName}
                    {item.variantName && <div style={{ fontSize: '10px', color: '#555' }}>- {item.variantName}</div>}
                    {item.specialInstructions && <div style={{ fontSize: '10px', fontWeight: 'bold' }}>*{item.specialInstructions}*</div>}
                  </td>
                  <td style={{ verticalAlign: 'top', paddingTop: '3px', textAlign: 'right' }}>{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><span>{order.subtotal}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery:</span><span>{order.deliveryFee}</span></div>
            {order.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount:</span><span>-{order.discountAmount}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
              <span>Total PKR:</span><span>{order.totalAmount}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px' }}>
            <p style={{ margin: '0' }}>Payment: {order.paymentMethod} ({order.paymentStatus})</p>
            <p style={{ margin: '10px 0 0 0', fontWeight: 'bold' }}>Thank You!</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
