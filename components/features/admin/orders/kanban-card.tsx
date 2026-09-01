"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveOrder } from "@/server/actions/live-orders";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, MessageCircle, MapPin, Printer, Plus, UtensilsCrossed, User, Phone, Bike, ShoppingBag, Receipt, CircleCheck, AlertCircle, Banknote, MapPinned, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { OrderStatus } from "@/server/actions/live-orders";
import { ManualOrderDialog } from "./manual-order-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { cancelLiveOrder, updateTableNumber, removeOrderItem, markOrderPaid } from "@/server/actions/live-orders";
import { getTablesWithStatus, transferTable } from "@/server/actions/tables";
import { MoreVertical, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KanbanCardProps {
  order: LiveOrder;
  role: "admin" | "manager" | "kitchen" | "cashier";
  isOverlay?: boolean;
  borderColor?: string;
  onStatusChange?: (id: string, status: OrderStatus) => void;
}

// Ensure tailwind generates these dynamic background classes
const SAFE_BG_CLASSES = "bg-amber-400 dark:bg-amber-500 bg-blue-400 dark:bg-blue-500 bg-purple-400 dark:bg-purple-500 bg-emerald-400 dark:bg-emerald-500 bg-indigo-400 dark:bg-indigo-500 text-white";

const getBgColor = (borderClass: string) => borderClass.replace(/border-/g, "bg-");

const getOrderTypeColor = (type: string) => {
  switch (type) {
    case "dine_in": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    case "delivery": return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    case "pickup": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    default: return "bg-muted/50 border-primary/20 text-primary";
  }
};

function formatPhone(phone: string | null) {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("92") && clean.length === 12) {
    clean = "0" + clean.slice(2);
  }
  if (clean.length === 11) {
    return clean.slice(0, 4) + " " + clean.slice(4);
  }
  return phone;
}

export function KanbanCard({ order, role, isOverlay, borderColor = "border-border", onStatusChange }: KanbanCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [editTableValue, setEditTableValue] = useState(order.tableNumber || "");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferTableId, setSelectedTransferTableId] = useState("");
  const queryClient = useQueryClient();

  const { data: tablesData, isLoading: isTablesLoading } = useQuery({
    queryKey: ["pos-tables"],
    queryFn: async () => {
      const res = await getTablesWithStatus();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isTransferModalOpen
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLiveOrder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const previousOrders = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((o: any) => o.id !== id),
        };
      });
      return { previousOrders };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      toast.error("Failed to cancel order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      setIsSheetOpen(false);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => markOrderPaid(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const previousOrders = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) => o.id === id ? { ...o, paymentStatus: "paid" } : o),
        };
      });
      return { previousOrders };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      toast.error("Failed to mark as paid");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  const voidItemMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string, itemId: string }) => removeOrderItem(orderId, itemId),
    onMutate: async ({ orderId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const previousOrders = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) => {
            if (o.id !== orderId) return o;
            const remainingItems = o.items.filter((i: any) => i.id !== itemId);
            const newSubtotal = Math.max(0, o.subtotal - (o.items.find((i: any) => i.id === itemId)?.subtotal || 0));
            const newTotalAmount = Math.max(0, newSubtotal + (o.deliveryFee || 0) - (o.discountAmount || 0));
            return {
              ...o,
              items: remainingItems,
              subtotal: newSubtotal,
              totalAmount: newTotalAmount
            };
          }),
        };
      });
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      toast.error("Failed to void item");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ orderId, tableNumber }: { orderId: string, tableNumber: string }) => updateTableNumber(orderId, tableNumber),
    onMutate: async ({ orderId, tableNumber }) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const previousOrders = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) => o.id === orderId ? { ...o, tableNumber } : o),
        };
      });
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      toast.error("Failed to update table");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ orderId, newTableId }: { orderId: string, newTableId: string }) => transferTable(orderId, newTableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
      queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
      setIsTransferModalOpen(false);
      setIsSheetOpen(false); // optionally close the sheet
      toast.success("Table transferred successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to transfer table"),
  });


  
  // Status advancement logic
  const getNextStatus = (current: OrderStatus): { label: string, status: OrderStatus } | null => {
    switch (current) {
      case "pending": return { label: "Approve Order", status: "approved" };
      case "approved": return { label: "Start Preparing", status: "preparing" };
      case "preparing": return { label: "Mark as Ready", status: "ready_for_pickup" };
      case "ready_for_pickup": 
        if (order.orderType === "delivery") return { label: "Out for Delivery", status: "out_for_delivery" };
        return { label: "Complete Order", status: "delivered" as OrderStatus };
      case "out_for_delivery": return { label: "Complete Order", status: "delivered" as OrderStatus };
      default: return null;
    }
  };
  
  const getPrevStatus = (current: OrderStatus): { label: string, status: OrderStatus } | null => {
    switch (current) {
      case "approved": return { label: "Back to Pending", status: "pending" };
      case "preparing": return { label: "Back to Approved", status: "approved" };
      case "ready_for_pickup": return { label: "Back to Preparing", status: "preparing" };
      case "out_for_delivery": return { label: "Back to Ready", status: "ready_for_pickup" };
      default: return null;
    }
  };
  
  const nextAction = getNextStatus(order.status as OrderStatus);
  const prevAction = getPrevStatus(order.status as OrderStatus);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isKitchen = role === "kitchen";
  const isDineIn = order.orderType === "dine_in";

  // Group items by round number for KOT
  const rounds = order.items.reduce((acc, item) => {
    const round = item.roundNumber || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(item);
    return acc;
  }, {} as Record<number, typeof order.items>);

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-[4px] relative cursor-grab active:cursor-grabbing active:scale-105 overflow-hidden transition-all duration-300 p-3.5 sm:p-4 pb-8 sm:pb-8 receipt-bottom",
        "drop-shadow-md hover:drop-shadow-xl border border-black/5 dark:border-white/5",
        "bg-white dark:bg-zinc-950 text-stone-950 dark:text-stone-100",
        isDragging && "opacity-50 ring-2 ring-primary shadow-2xl",
        isOverlay && "ring-2 ring-primary shadow-xl rotate-2",
      )}
      onClick={() => setIsSheetOpen(true)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col border-l-0 sm:border-l bg-background shadow-2xl">
          {/* Header */}
          <SheetHeader className="px-5 sm:px-6 py-4 border-b bg-muted/20 shrink-0 relative">
            {!isKitchen && (
              <div className="absolute top-4 right-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isDineIn && (
                      <DropdownMenuItem onSelect={() => setIsTransferModalOpen(true)} className="cursor-pointer font-semibold">
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Transfer Table
                      </DropdownMenuItem>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer font-semibold">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel Order
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the order and remove it from the active board. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Order</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={() => cancelMutation.mutate(order.id)}
                          >
                            Yes, Cancel Order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div className="flex flex-col pr-4 gap-2">
              <SheetTitle className="text-2xl font-black tracking-tight truncate">
                #{order.id}
              </SheetTitle>
              
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn("uppercase font-black tracking-widest text-[9px] px-1.5 py-0", getOrderTypeColor(order.orderType))}>
                  {order.orderType.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={cn("uppercase font-black tracking-widest text-[9px] px-1.5 py-0 border", borderColor)}>
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <SheetDescription className="text-[11px] font-semibold mt-0.5 text-muted-foreground flex flex-wrap items-center gap-1.5 uppercase tracking-wider">
                <Badge className={cn(
                  "uppercase font-black tracking-widest text-[9px] px-1.5 py-0 border-0 shadow-sm",
                  order.paymentStatus === "paid" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"
                )}>
                  {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
                <span className="opacity-50">•</span>
                <LiveTime date={order.createdAt || new Date()} /> ago
                {order.estimatedReadyAt && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className={cn(
                      "font-bold",
                      new Date(order.estimatedReadyAt) < new Date() ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      ETA: {new Date(order.estimatedReadyAt) < new Date() ? "Overdue" : format(new Date(order.estimatedReadyAt), "h:mm a")}
                    </span>
                  </>
                )}
              </SheetDescription>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:px-6 bg-background">
            {/* Minimal Info Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-dashed">
              {isDineIn ? (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3 h-3" /> Table Info
                    </div>
                    {isTableEditing ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Input 
                          value={editTableValue}
                          onChange={(e) => setEditTableValue(e.target.value)}
                          className="h-7 w-24 text-xs px-2 font-bold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateTableMutation.mutate({ orderId: order.id, tableNumber: editTableValue });
                              setIsTableEditing(false);
                            }
                            if (e.key === "Escape") {
                              setIsTableEditing(false);
                              setEditTableValue(order.tableNumber || "");
                            }
                          }}
                          onBlur={() => {
                            if (editTableValue !== order.tableNumber) {
                              updateTableMutation.mutate({ orderId: order.id, tableNumber: editTableValue });
                            }
                            setIsTableEditing(false);
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "font-bold text-base text-foreground",
                          !isKitchen && "cursor-pointer hover:underline decoration-dashed decoration-primary/50 underline-offset-4"
                        )}
                        onClick={() => !isKitchen && setIsTableEditing(true)}
                      >
                        Table {order.tableNumber || "N/A"}
                      </div>
                    )}
                    <div className="text-xs font-medium text-muted-foreground">Waiter: {order.waiterName || "Unassigned"}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle2 className="w-3 h-3" /> Customer
                    </div>
                    {order.customerName ? (
                      <>
                        <div className="font-bold text-sm text-foreground capitalize truncate">{order.customerName}</div>
                        {order.customerPhone && (
                          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {formatPhone(order.customerPhone)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="font-semibold text-sm text-foreground/50">Walk-in Guest</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle2 className="w-3 h-3" /> Customer Detail
                    </div>
                    <div className="font-bold text-sm text-foreground capitalize truncate">{order.customerName || "Walk-in Guest"}</div>
                    {order.customerPhone && (
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {formatPhone(order.customerPhone)}
                      </div>
                    )}
                  </div>
                  {order.orderType === "delivery" && order.deliveryAddress && (
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPinned className="w-3 h-3" /> Delivery Address
                      </div>
                      {order.latitude && order.longitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline leading-snug line-clamp-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.deliveryAddress}
                        </a>
                      ) : (
                        <span className="font-semibold text-xs text-foreground leading-snug line-clamp-3">
                          {order.deliveryAddress}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" /> 
                Order Details
                <Badge variant="secondary" className="ml-auto bg-muted font-bold text-[10px]">
                  {order.items.length} items
                </Badge>
              </h3>
              
              <div className="space-y-4">
                {Object.entries(rounds).map(([roundNum, items]) => (
                  <div key={roundNum} className="space-y-2">
                    {Object.keys(rounds).length > 1 && (
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pb-1 border-b">
                        Round {roundNum}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="text-foreground font-bold text-xs h-6 w-6 rounded border flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight text-foreground">
                                {item.itemName} {item.variantName ? <span className="text-muted-foreground">({item.variantName})</span> : ""}
                              </span>
                              {Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0 && (
                                <span className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                  + {(item.selectedAddOns as any[]).map((a: any) => String(a.name || "")).join(", ")}
                                </span>
                              )}
                              {item.specialInstructions && (
                                <div className="flex items-start gap-1 mt-1 text-rose-500">
                                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span className="text-[11px] font-bold leading-tight">
                                    {item.specialInstructions}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {!isKitchen && (
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Void this item?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove "{item.itemName}" from the order and automatically recalculate the bill total.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-rose-600 hover:bg-rose-700 text-white"
                                      onClick={() => voidItemMutation.mutate({ orderId: order.id, itemId: item.id })}
                                    >
                                      Void Item
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <span className="font-bold text-sm text-right min-w-[50px]">
                                Rs. {String(item.subtotal)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
            
          {/* Action & Financial Footer */}
          {!isKitchen && (
            <div className="p-5 sm:px-6 border-t bg-background shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
              {/* Financial Breakdown */}
              <div className="flex flex-col gap-1 mb-4">
                {(order.deliveryFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold">
                    <span>Delivery Fee</span>
                    <span>Rs. {order.deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">Total Bill</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 py-0 px-1.5 h-4">
                      <Banknote className="w-3 h-3" /> {order.paymentMethod || "Cash"}
                    </Badge>
                  </div>
                  <span className="text-2xl font-black text-primary tracking-tight">
                    Rs. {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isDineIn && (
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <div onClick={(e) => e.stopPropagation()}>
                      <ManualOrderDialog existingOrder={order}>
                        <Button variant="outline" className="w-full h-10 font-bold text-sm shadow-sm hover:shadow-md">
                          <Plus className="w-4 h-4 mr-2" /> Add Items
                        </Button>
                      </ManualOrderDialog>
                    </div>
                    <Button variant="default" className="w-full h-10 font-bold text-sm shadow-sm hover:shadow-md" onClick={(e) => { e.stopPropagation(); window.print(); }}>
                      <Printer className="w-4 h-4 mr-2" /> Print Bill
                    </Button>
                  </div>
                )}
                
                {order.paymentStatus === "unpaid" && !isKitchen && (
                  <Button 
                    variant="default"
                    className="w-full h-10 font-bold text-sm shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => markPaidMutation.mutate(order.id)}
                  >
                    <Banknote className="w-4 h-4 mr-2" /> Mark as Paid
                  </Button>
                )}
                {nextAction && (
                  <Button 
                    className="w-full h-10 font-bold text-sm shadow-md transition-all"
                    onClick={() => {
                      onStatusChange?.(order.id, nextAction.status);
                      setIsSheetOpen(false);
                    }}
                  >
                    <CircleCheck className="w-4 h-4 mr-2" />
                    {nextAction.label}
                  </Button>
                )}
                {(
                  (order.orderType === "pickup" && (order.status === "ready_for_pickup" || order.status === "delivered")) ||
                  (order.orderType === "delivery" && order.status === "delivered")
                ) && (
                  <Button variant="outline" className="w-full h-10 font-semibold text-sm shadow-sm" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col gap-1.5">
            <span className={cn("font-black tracking-tight", isKitchen ? "text-2xl" : "text-xl")}>
              #{order.id}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={cn("text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 text-white hover:text-white border-0 shadow-sm whitespace-nowrap", getBgColor(borderColor))}>
                {order.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 shadow-sm whitespace-nowrap", getOrderTypeColor(order.orderType))}>
                {order.orderType.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start">
            <div className="text-[11px] font-bold bg-muted/80 text-muted-foreground border border-black/5 dark:border-white/5 px-2 py-0.5 rounded whitespace-nowrap shadow-sm tracking-tight">
              <LiveTime date={order.createdAt || new Date()} /> ago
            </div>
            {order.estimatedReadyAt && (
              <div className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow-sm border tracking-tight",
                new Date(order.estimatedReadyAt) < new Date() 
                  ? "bg-red-500/10 text-red-600 border-red-500/20" 
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              )}>
                {new Date(order.estimatedReadyAt) < new Date() ? "Overdue" : format(new Date(order.estimatedReadyAt), "h:mm a")}
              </div>
            )}
          </div>
        </div>

        {/* Details Card */}
        {!isKitchen && (
          <div className="my-3 bg-muted/30 border border-black/5 dark:border-white/5 rounded-md p-2.5 space-y-2">
            {isDineIn ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[13px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Table {order.tableNumber || "N/A"} 
                  <span className="text-muted-foreground font-normal mx-1">•</span> 
                  <span className="text-foreground">{order.waiterName || "Unassigned"}</span>
                </div>
                {order.customerName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <User className="h-3 w-3 text-primary/70 shrink-0" />
                    <span className="capitalize line-clamp-1">{order.customerName}</span>
                    {order.customerPhone && (
                      <>
                        <span className="mx-0.5">•</span>
                        <Phone className="h-3 w-3 text-primary/70 shrink-0" />
                        <span className="tabular-nums tracking-tight">{formatPhone(order.customerPhone)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[13px] font-bold">
                  <User className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                  <span className="capitalize line-clamp-1">{order.customerName || "Walk-in Guest"}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Phone className="h-3 w-3 text-primary/70 shrink-0" />
                    <span className="tabular-nums tracking-tight">{formatPhone(order.customerPhone)}</span>
                  </div>
                )}
              </div>
            )}
            
            {order.orderType === "delivery" && order.deliveryAddress && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
                <MapPin className="h-3 w-3 mt-0.5 text-primary/70 shrink-0" />
                {order.latitude && order.longitude ? (
                  <a 
                    href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="line-clamp-2 leading-relaxed hover:underline text-blue-600 dark:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.deliveryAddress}
                  </a>
                ) : (
                  <span className="line-clamp-2 leading-relaxed">{order.deliveryAddress}</span>
                )}
              </div>
            )}
            {order.source === "whatsapp" && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-green-700 bg-green-500/10 w-fit px-1.5 py-0.5 rounded mt-1">
                <MessageCircle className="h-3 w-3" />
                Ordered via WhatsApp
              </div>
            )}
          </div>
        )}

        {/* Kitchen Dine-in fallback */}
        {isKitchen && isDineIn && (
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-2 mb-3 flex items-center gap-1">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Table {order.tableNumber || "N/A"} • {order.waiterName || "Unassigned"}
          </div>
        )}

        {/* Order Items (KOT Grouping) */}
        <div className="space-y-2 mt-2 border-t border-dashed pt-3">
          {Object.entries(rounds).map(([roundNum, items]) => (
            <div key={roundNum} className="space-y-1.5">
              {Object.keys(rounds).length > 1 && (
                <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Round {roundNum}
                </div>
              )}
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex justify-between items-start",
                    item.status === "served" && isKitchen ? "opacity-30 line-through" : ""
                  )}
                >
                  <div className="flex gap-2">
                    <span className={cn("font-bold", isKitchen ? "text-xl text-primary" : "text-[13px]")}>
                      {item.quantity}x
                    </span>
                    <div className="flex flex-col">
                      <span className={cn("font-semibold", isKitchen ? "text-xl leading-tight" : "text-[13px] leading-tight")}>
                        {item.itemName} {item.variantName ? `(${item.variantName})` : ""}
                      </span>
                      {Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0 && (
                        <span className={cn("text-muted-foreground", isKitchen ? "text-base font-medium mt-0.5" : "text-[11px] leading-tight")}>
                          + {(item.selectedAddOns as any[]).map((a: any) => String(a.name || "")).join(", ")}
                        </span>
                      )}
                      {item.specialInstructions && (
                        <span className={cn("text-red-500 font-semibold", isKitchen ? "text-base mt-0.5" : "text-[11px] leading-tight")}>
                          *** {item.specialInstructions}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isKitchen && (
                    <span className="text-[13px] font-bold text-muted-foreground whitespace-nowrap ml-2">
                      Rs. {String(item.subtotal)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer (Admin Only) */}
        {!isKitchen && (
          <div className="mt-3 pt-3 border-t border-dashed flex flex-col gap-1.5">
            {(order.deliveryFee ?? 0) > 0 && (
              <div className="flex justify-between items-center text-[12px] text-muted-foreground font-medium">
                <span>Delivery</span>
                <span>Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold">
              <span className="text-sm">Total</span>
              <span className="font-black text-base text-primary">Rs. {order.totalAmount.toLocaleString()}</span>
            </div>
            
            {/* Dine-In Actions */}
            {isDineIn && (
              <div className="flex gap-2 mt-1">
                <div onClick={(e) => e.stopPropagation()} className="w-full">
                  <ManualOrderDialog existingOrder={order}>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </ManualOrderDialog>
                </div>
                <Button variant="default" size="sm" className="w-full text-xs h-8" onClick={(e) => e.stopPropagation()}>
                  <Printer className="h-3 w-3 mr-1" /> Bill
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    
    <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Table</DialogTitle>
          <DialogDescription>
            Move this active order to another table. You can only select free tables.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select 
            value={selectedTransferTableId}
            onValueChange={setSelectedTransferTableId}
          >
            <SelectTrigger className="h-10 w-full bg-background">
              <SelectValue placeholder="Select new table..." />
            </SelectTrigger>
            <SelectContent>
              {tablesData?.map(table => (
                <SelectItem key={table.id} value={table.id} disabled={table.isOccupied}>
                  {table.name} {table.isOccupied ? "(Occupied)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
          <Button 
            disabled={!selectedTransferTableId || transferMutation.isPending}
            onClick={() => transferMutation.mutate({ orderId: order.id, newTableId: selectedTransferTableId })}
          >
            {transferMutation.isPending ? "Transferring..." : "Transfer Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function LiveTime({ date }: { date: Date | string }) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const update = () => {
      setTimeStr(formatDistanceToNow(new Date(date)).replace("about ", ""));
    };
    update();
    const interval = setInterval(update, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [date]);

  // Prevent hydration mismatch by returning nothing until mounted,
  // or return the initial calculated string. 
  // It's safer to just return the string and accept hydration warning if the minute flips,
  // or use a mounted state. Let's use mounted state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span>{formatDistanceToNow(new Date(date)).replace("about ", "")}</span>;
  }

  return <span>{timeStr}</span>;
}
