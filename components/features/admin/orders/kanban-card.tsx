"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveOrderProjection } from "@/server/actions/live-orders";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, MessageCircle, MapPin, Printer, Plus, UtensilsCrossed, User, Phone, Bike, ShoppingBag, Receipt, CircleCheck, AlertCircle, Banknote, MapPinned, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { VoidReasonDialog } from "./void-reason-dialog";

interface KanbanCardProps {
  order: LiveOrderProjection;
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

export const KanbanCard = React.memo(function KanbanCard({ order, role, isOverlay, borderColor = "border-border", onStatusChange }: KanbanCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [editTableValue, setEditTableValue] = useState(order.tableNumber || "");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferTableId, setSelectedTransferTableId] = useState("");
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{ type: "order" | "item", itemId?: string } | null>(null);
  // Cash tendered calculator for the order detail sheet
  const [cashTendered, setCashTendered] = useState<string>("");

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
    mutationFn: ({ id, reason, isWaste }: { id: string, reason: string, isWaste: boolean }) => cancelLiveOrder(id, order.orderVersion, reason, isWaste),
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
    onError: (err: any, id, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      if (err.message && err.message.includes("CONCURRENCY_CONFLICT")) {
        toast.error("Order was modified by someone else. Refreshing...");
      } else {
        toast.error("Failed to cancel order");
      }
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      setIsSheetOpen(false);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => markOrderPaid(id, order.orderVersion),
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
    onError: (err: any, id, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      if (err.message && err.message.includes("CONCURRENCY_CONFLICT")) {
        toast.error("Order was modified by someone else. Refreshing...");
      } else {
        toast.error("Failed to mark as paid");
      }
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  const voidItemMutation = useMutation({
    mutationFn: ({ orderId, itemId, reason, isWaste }: { orderId: string, itemId: string, reason: string, isWaste: boolean }) => removeOrderItem(orderId, order.orderVersion, itemId),
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
    onError: (err: any, variables, context) => {
      queryClient.setQueryData(["live-orders"], context?.previousOrders);
      if (err.message && err.message.includes("CONCURRENCY_CONFLICT")) {
        toast.error("Order was modified by someone else. Refreshing...");
      } else {
        toast.error("Failed to void item");
      }
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ orderId, tableNumber }: { orderId: string, tableNumber: string }) => updateTableNumber(orderId, order.orderVersion, tableNumber),
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

  const printReceipt = () => {
    const receiptHtml = document.getElementById(`receipt-${order.id}`)?.innerHTML;
    if (!receiptHtml) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentWindow?.document.write(`
      <html>
        <head>
          <title>Print Receipt - ${order.id}</title>
          <style>
            @page { margin: 0; size: 80mm 297mm; }
            body { 
              font-family: monospace, sans-serif; 
              font-size: 12px; 
              width: 80mm; 
              margin: 0; 
              padding: 4mm;
              color: black;
              background: white;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .w-full { width: 100%; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .mt-2 { margin-top: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .border-b { border-bottom: 1px dashed black; }
            .border-t { border-top: 1px dashed black; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .pt-2 { padding-top: 8px; }
            .pb-2 { padding-bottom: 8px; }
            .text-right { text-align: right; }
            .uppercase { text-transform: uppercase; }
            .logo { width: 48px; height: 48px; display: block; margin: 0 auto; margin-bottom: 4px; }
            .item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            .item-qty { width: 24px; font-weight: bold; }
            .item-name { flex: 1; padding-right: 8px; }
            .item-price { font-weight: bold; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `);
    
    iframe.contentWindow?.document.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 250);
  };


  
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
                            onClick={() => {
                              setVoidTarget({ type: "order" });
                              setIsVoidDialogOpen(true);
                            }}
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
                {isDineIn && Object.keys(rounds).length > 1 && (
                  <Badge className="uppercase font-black tracking-widest text-[9px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500 text-white border-0">
                    ✏ Updated — {Object.keys(rounds).length} Rounds
                  </Badge>
                )}
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
                        {order.tableNumber || "N/A"}
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  Order Details
                </h3>
                <Badge variant="secondary" className="ml-auto bg-muted font-bold text-[10px]">
                  {order.items.length} items
                </Badge>
              </div>

              {/* Edit-lock notice for dine-in orders already in the kitchen */}
              {isDineIn && ["preparing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status) && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Kitchen has this order — items cannot be removed. You can still add new items.
                </div>
              )}

              <div className="space-y-4">
                {Object.entries(rounds).map(([roundNum, roundItems]) => {
                  const addedRound = Number(roundNum) > 1;
                  return (
                    <div key={roundNum} className="space-y-2">
                      {Object.keys(rounds).length > 1 && (
                        <div className={cn(
                          "text-[10px] uppercase font-bold tracking-widest pb-1 border-b flex items-center gap-2",
                          addedRound
                            ? "text-amber-700 border-amber-200"
                            : "text-muted-foreground border-border"
                        )}>
                          Round {roundNum}
                          {addedRound && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                              Added Later
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        {roundItems.map((item) => {
                          const addOns = Array.isArray(item.selectedAddOns)
                            ? (item.selectedAddOns as { name: string; price?: number }[])
                            : [];
                          // Items can only be voided before the kitchen has the order
                          const canVoid =
                            !isKitchen &&
                            !["preparing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(
                              order.status
                            );

                          return (
                            <div key={item.id} className="flex justify-between items-start">
                              <div className="flex gap-3 flex-1 min-w-0">
                                {/* Quantity badge — larger and prominent */}
                                <div className="text-foreground font-black text-sm h-8 w-8 rounded border border-primary/30 bg-primary/5 flex items-center justify-center shrink-0">
                                  {item.quantity}×
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-base leading-tight text-foreground">
                                    {item.itemName}
                                    {item.variantName && (
                                      <span className="font-normal text-muted-foreground ml-1 text-sm">
                                        ({item.variantName})
                                      </span>
                                    )}
                                  </span>
                                  {addOns.length > 0 && (
                                    <span className="text-muted-foreground text-xs font-semibold mt-0.5">
                                      + {addOns.map((a) => String(a.name || "")).join(", ")}
                                    </span>
                                  )}
                                  {item.specialInstructions &&
                                    !(item.specialInstructions.startsWith("[DEAL:") &&
                                      item.specialInstructions.endsWith("]")) && (
                                    <div className="flex items-start gap-1 mt-1 text-rose-500">
                                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                      <span className="text-xs font-bold leading-tight">
                                        {item.specialInstructions}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isKitchen && (
                                <div className="flex items-center gap-2 ml-4 shrink-0">
                                  {canVoid ? (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                                          aria-label={`Void ${item.itemName}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Void this item?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will remove &quot;{item.itemName}&quot; from the order and automatically
                                            recalculate the bill total.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-rose-600 hover:bg-rose-700 text-white"
                                            onClick={() => {
                                              setVoidTarget({ type: "item", itemId: item.id });
                                              setIsVoidDialogOpen(true);
                                            }}
                                          >
                                            Void Item
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  ) : (
                                    /* Locked placeholder so price column aligns */
                                    <div className="w-7" />
                                  )}
                                  <span className="font-bold text-base text-right min-w-[60px]">
                                    Rs. {String(item.subtotal)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                {(order.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 text-xs font-semibold">
                    <span>Discount</span>
                    <span>− Rs. {order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end mt-1 pt-1 border-t border-dashed">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">Total Bill</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 py-0 px-1.5 h-4">
                      <Banknote className="w-3 h-3" /> {order.paymentMethod || "Cash"}
                    </Badge>
                  </div>
                  <span className="text-3xl font-black text-primary tracking-tight">
                    Rs. {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Cash Tendered / Change Calculator
                  Only shown for Cash/COD payments that are marked paid */}
              {(order.paymentMethod === "Cash" || order.paymentMethod === "COD") &&
                order.paymentStatus === "paid" && (
                <div className="mb-4 p-3 bg-muted/50 border space-y-2.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                    Cash Received
                  </Label>
                  <div className="flex gap-1.5">
                    {([500, 1000, 2000, 5000] as const).map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={Number(cashTendered) === amount ? "default" : "outline"}
                        size="sm"
                        className="h-8 flex-1 text-xs font-bold rounded-none px-1"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          setCashTendered(String(amount));
                        }}
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    placeholder={`Min Rs. ${order.totalAmount}`}
                    value={cashTendered}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCashTendered(e.target.value)
                    }
                    className="h-12 text-xl font-black text-right shadow-none rounded-none"
                    min={order.totalAmount}
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                  />
                  {cashTendered !== "" && Number(cashTendered) >= order.totalAmount && (
                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                      <span className="text-sm font-bold text-muted-foreground">Change to Return</span>
                      <span className="text-2xl font-black text-emerald-600">
                        Rs. {(Number(cashTendered) - order.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {cashTendered !== "" &&
                    Number(cashTendered) > 0 &&
                    Number(cashTendered) < order.totalAmount && (
                    <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Short by Rs. {(order.totalAmount - Number(cashTendered)).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

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
                    <Button variant="default" className="w-full h-10 font-bold text-sm shadow-sm hover:shadow-md" onClick={(e) => { e.stopPropagation(); printReceipt(); }}>
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
                  <Button variant="outline" className="w-full h-10 font-semibold text-sm shadow-sm" onClick={(e) => { e.stopPropagation(); printReceipt(); }}>
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
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-2">
            <span className={cn("font-black tracking-tight", isKitchen ? "text-3xl" : "text-2xl")}>
              #{order.id}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {/* Status badge — larger so it is readable from across the room */}
              <Badge className={cn(
                "text-[11px] uppercase font-black tracking-wider px-2.5 py-0.5 text-white hover:text-white border-0 shadow-sm whitespace-nowrap",
                getBgColor(borderColor)
              )}>
                {order.status.replace(/_/g, " ")}
              </Badge>
              {/* Order type badge */}
              <Badge variant="outline" className={cn(
                "text-[11px] uppercase font-black tracking-wider px-2.5 py-0.5 shadow-sm whitespace-nowrap",
                getOrderTypeColor(order.orderType)
              )}>
                {order.orderType.replace(/_/g, " ")}
              </Badge>
              {/* "Updated" badge — shown when dine-in has had items added after the first round */}
              {isDineIn && Object.keys(rounds).length > 1 && (
                <Badge className="text-[11px] uppercase font-black tracking-wider px-2.5 py-0.5 bg-amber-500 hover:bg-amber-500 text-white border-0 shadow-sm whitespace-nowrap">
                  ✏ Updated
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start">
            <div className="text-xs font-bold bg-muted/80 text-muted-foreground border border-black/5 dark:border-white/5 px-2 py-0.5 rounded whitespace-nowrap shadow-sm tracking-tight">
              <LiveTime date={order.createdAt || new Date()} /> ago
            </div>
            {order.estimatedReadyAt && (
              <div className={cn(
                "text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap shadow-sm border tracking-tight",
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
          <div className="my-3 bg-muted/30 border border-black/5 dark:border-white/5 p-2.5 space-y-2">
            {isDineIn ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[13px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  {order.tableNumber || "N/A"} 
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
            {order.tableNumber || "N/A"} • {order.waiterName || "Unassigned"}
          </div>
        )}

        {/* Order Items (KOT Grouping) */}
        <div className="space-y-2 mt-2 border-t border-dashed pt-3">
          {Object.entries(rounds).map(([roundNum, roundItems]) => (
            <div key={roundNum} className="space-y-1.5">
              {Object.keys(rounds).length > 1 && (
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1.5">
                  <span>Round {roundNum}</span>
                  {Number(roundNum) > 1 && (
                    <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      Added
                    </span>
                  )}
                </div>
              )}
              {roundItems.map((item) => {
                const addOns = Array.isArray(item.selectedAddOns)
                  ? (item.selectedAddOns as { name: string; price?: number }[])
                  : [];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex justify-between items-start",
                      item.status === "served" && isKitchen ? "opacity-30 line-through" : ""
                    )}
                  >
                    <div className="flex gap-2">
                      <span className={cn("font-black shrink-0", isKitchen ? "text-2xl text-primary" : "text-base text-primary")}>
                        {item.quantity}×
                      </span>
                      <div className="flex flex-col">
                        <span className={cn("font-bold leading-tight", isKitchen ? "text-xl" : "text-[15px]")}>
                          {item.itemName}
                          {item.variantName && (
                            <span className="font-normal text-muted-foreground ml-1">
                              ({item.variantName})
                            </span>
                          )}
                        </span>
                        {addOns.length > 0 && (
                          <span className={cn("text-muted-foreground font-medium mt-0.5", isKitchen ? "text-base" : "text-xs")}>
                            + {addOns.map((a) => String(a.name || "")).join(", ")}
                          </span>
                        )}
                        {item.specialInstructions &&
                          !(item.specialInstructions.startsWith("[DEAL:") &&
                            item.specialInstructions.endsWith("]")) && (
                          <span className={cn("text-red-500 font-bold mt-0.5", isKitchen ? "text-base" : "text-xs")}>
                            *** {item.specialInstructions}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isKitchen && (
                      <span className="text-base font-black text-muted-foreground whitespace-nowrap ml-2">
                        Rs. {String(item.subtotal)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer (Admin Only) */}
        {!isKitchen && (
          <div className="mt-3 pt-3 border-t border-dashed flex flex-col gap-1.5">
            {(order.deliveryFee ?? 0) > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                <span>Delivery</span>
                <span>Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold">
              <span className="text-base font-bold">Total</span>
              <span className="font-black text-xl text-primary">Rs. {order.totalAmount.toLocaleString()}</span>
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
                <Button variant="default" size="sm" className="w-full text-xs h-8" onClick={(e) => { e.stopPropagation(); printReceipt(); }}>
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

    {/* Hidden Printable Receipt Template */}
    <div id={`receipt-${order.id}`} style={{ display: "none" }}>
      <div className="text-center mb-2">
        <img src="/logo.png" className="logo" alt="Classy Crave Logo" />
        <div className="text-xl font-bold uppercase">Classy Crave</div>
        <div className="uppercase my-1 text-lg font-bold border-b pb-2">
          {order.orderType.replace("_", " ")}
        </div>
        {Object.keys(rounds).length > 1 && (
          <div className="font-bold text-center uppercase text-sm border border-amber-400 bg-amber-50 text-amber-800 px-2 py-1 my-2">
            ★ UPDATED ORDER — {Object.keys(rounds).length} ROUNDS
          </div>
        )}
      </div>
      
      <div className="mb-2 pb-2 border-b">
        <div className="font-bold text-lg mb-1">Order #{order.id}</div>
        <div>Date: {format(order.createdAt || new Date(), "dd/MM/yyyy hh:mm a")}</div>
        
        <div className="mt-2">
          {isDineIn ? (
            <>
              <div className="font-bold text-lg">Table: {order.tableNumber || "N/A"}</div>
              <div>Waiter: {order.waiterName || "Unassigned"}</div>
            </>
          ) : (
            <>
              {order.customerName && <div>Customer: {order.customerName}</div>}
              {order.customerPhone && <div>Phone: {formatPhone(order.customerPhone)}</div>}
              {order.orderType === "delivery" && order.deliveryAddress && <div>Address: {order.deliveryAddress}</div>}
            </>
          )}
        </div>
      </div>
      
      <div className="mb-2 pb-2 border-b">
        <div className="font-bold mb-2 uppercase text-center">--- ITEMS ---</div>
        {order.items.map((item, idx) => (
          <div key={idx} className="item-row">
            <div className="item-qty">{item.quantity}x</div>
            <div className="item-name">
              {item.itemName} {item.variantName ? `(${item.variantName})` : ""}
              {Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0 && (
                <div style={{ fontSize: "10px", marginTop: "2px" }}>
                  + {(item.selectedAddOns as any[]).map((a: any) => String(a.name || "")).join(", ")}
                </div>
              )}
            </div>
            <div className="item-price">Rs.{item.subtotal}</div>
          </div>
        ))}
      </div>
      
      <div className="pt-2">
        {(order.deliveryFee ?? 0) > 0 && (
          <div className="flex justify-between my-1">
            <span>Delivery Fee</span>
            <span>Rs.{order.deliveryFee}</span>
          </div>
        )}
        <div className="flex justify-between items-center my-2 border-t pt-2">
          <span className="font-bold text-xl uppercase">Total</span>
          <span className="font-bold text-xl">Rs.{order.totalAmount.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="text-center mt-4 pt-2 border-t font-bold">
        <div>Thank you for dining with us!</div>
        <div style={{ fontSize: "10px", marginTop: "4px" }}>Powered by AgencyFast</div>
      </div>
    </div>
      <VoidReasonDialog
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        isItemLevel={voidTarget?.type === "item"}
        onConfirm={(reason, isWaste) => {
          if (voidTarget?.type === "order") {
            cancelMutation.mutate({ id: order.id, reason, isWaste });
          } else if (voidTarget?.type === "item" && voidTarget.itemId) {
            voidItemMutation.mutate({ orderId: order.id, itemId: voidTarget.itemId, reason, isWaste });
          }
        }}
      />
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.paymentStatus === nextProps.order.paymentStatus &&
    prevProps.order.updatedAt?.getTime() === nextProps.order.updatedAt?.getTime() &&
    prevProps.order.items.length === nextProps.order.items.length &&
    prevProps.isOverlay === nextProps.isOverlay &&
    prevProps.role === nextProps.role &&
    prevProps.borderColor === nextProps.borderColor
  );
});

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
