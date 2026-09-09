"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveOrderProjection } from "@/server/actions/live-orders";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageCircle, MapPin, Printer, Plus, UtensilsCrossed, User, Phone,
  Bike, Receipt, CircleCheck, AlertCircle, Banknote, MapPinned,
  UserCircle2, Loader2, CheckCircle2, ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import { OrderStatus } from "@/server/actions/live-orders";
import { ManualOrderDialog } from "./manual-order-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  cancelLiveOrder, updateTableNumber, removeOrderItem, markOrderPaid,
  assignRiderToOrder, getAvailableRiders, rejectLiveOrder, archiveLiveOrder
} from "@/server/actions/live-orders";
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

const SAFE_BG_CLASSES = "bg-amber-400 dark:bg-amber-500 bg-blue-400 dark:bg-blue-500 bg-purple-400 dark:bg-purple-500 bg-emerald-400 dark:bg-emerald-500 bg-indigo-400 dark:bg-indigo-500 text-white";
const getBgColor = (borderClass: string) => borderClass.replace(/border-/g, "bg-");

const getOrderTypeColor = (type: string) => {
  switch (type) {
    case "dine_in":  return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    case "delivery": return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    case "pickup":   return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    default:         return "bg-muted/50 border-primary/20 text-primary";
  }
};

function formatPhone(phone: string | null) {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("92") && clean.length === 12) clean = "0" + clean.slice(2);
  if (clean.length === 11) return clean.slice(0, 4) + " " + clean.slice(4);
  return phone;
}

// ─── Print receipt helper ──────────────────────────────────────────────────────
function buildAndPrint(receiptId: string) {
  const receiptHtml = document.getElementById(receiptId)?.innerHTML;
  if (!receiptHtml) return;
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  iframe.contentWindow?.document.write(`<!DOCTYPE html><html><head><title>Slip</title><style>
    @page { margin: 0; size: 80mm 297mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; padding: 3mm 4mm; color: #000; background: #fff; }
    .center  { text-align: center; }
    .bold    { font-weight: 700; }
    .big     { font-size: 18px; }
    .xl      { font-size: 22px; }
    .xxl     { font-size: 28px; }
    .sm      { font-size: 9px; }
    .dash    { border-bottom: 1px dashed #000; margin: 4px 0; }
    .row     { display: flex; justify-content: space-between; align-items: flex-start; margin: 3px 0; }
    .qty     { width: 22px; font-weight: 700; font-size: 16px; shrink: 0; }
    .iname   { flex: 1; padding-right: 6px; font-weight: 700; font-size: 13px; }
    .iprice  { font-weight: 700; font-size: 13px; text-align: right; min-width: 50px; }
    .inote   { font-size: 10px; margin-left: 22px; font-weight: 700; }
    .addon   { font-size: 9px; margin-left: 22px; color: #333; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand   { font-size: 20px; font-weight: 700; }
    .due-box { border: 2px solid #000; padding: 4px 8px; margin: 6px 0; text-align: center; }
    .logo    { width: 52px; height: 52px; display: block; margin: 0 auto 4px; }
    .type-banner { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0; }
    .hall-tag { font-size: 10px; font-weight: 700; border: 1px solid #000; display: inline-block; padding: 1px 4px; margin-top: 2px; }
    .order-num { font-size: 20px; font-weight: 700; }
    .recall  { font-size: 14px; font-weight: 700; }
    .delivery-detail { font-size: 13px; font-weight: 700; margin: 2px 0; }
    .delivery-detail-sm { font-size: 11px; margin: 2px 0; }
  </style></head><body>${receiptHtml}</body></html>`);
  iframe.contentWindow?.document.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  }, 250);
}

export const KanbanCard = React.memo(function KanbanCard({
  order, role, isOverlay, borderColor = "border-border", onStatusChange,
}: KanbanCardProps) {
  const [isSheetOpen, setIsSheetOpen]           = useState(false);
  const [isTableEditing, setIsTableEditing]     = useState(false);
  const [editTableValue, setEditTableValue]     = useState(order.tableNumber || "");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferTableId, setSelectedTransferTableId] = useState("");
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidTarget, setVoidTarget]             = useState<{ type: "order" | "item"; itemId?: string } | null>(null);
  const [cashTendered, setCashTendered]         = useState<string>("");
  const [selectedRiderId, setSelectedRiderId]   = useState<string>(order.rider ? "" : "");

  const queryClient = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: tablesData } = useQuery({
    queryKey: ["pos-tables"],
    queryFn: async () => {
      const res = await getTablesWithStatus();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isTransferModalOpen,
  });

  const { data: ridersData } = useQuery({
    queryKey: ["available-riders"],
    queryFn: async () => {
      const res = await getAvailableRiders();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: isSheetOpen && order.orderType === "delivery",
    staleTime: 2 * 60 * 1000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, isWaste }: { id: string; reason: string; isWaste: boolean }) => {
      const cached = queryClient.getQueryData<{ data: LiveOrderProjection[] }>(["live-orders"]);
      const activeOrder = cached?.data?.find(o => o.id === id);
      return cancelLiveOrder(id, activeOrder?.orderVersion ?? order.orderVersion, reason, isWaste);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) =>
        old?.data ? { ...old, data: old.data.filter((o: any) => o.id !== id) } : old
      );
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error(err.message?.includes("CONCURRENCY_CONFLICT")
        ? "Order was modified by someone else. Refreshing..."
        : "Failed to cancel order");
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["live-orders"] }); setIsSheetOpen(false); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => {
      const cached = queryClient.getQueryData<{ data: LiveOrderProjection[] }>(["live-orders"]);
      const activeOrder = cached?.data?.find(o => o.id === id);
      return markOrderPaid(id, activeOrder?.orderVersion ?? order.orderVersion);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) =>
        old?.data ? { ...old, data: old.data.map((o: any) => o.id === id ? { ...o, paymentStatus: "paid" } : o) } : old
      );
      return { prev };
    },
    onError: (err: any, _id, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error(err.message?.includes("CONCURRENCY_CONFLICT") ? "Order modified by someone else." : "Failed to mark paid");
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["live-orders"] }),
  });

  const voidItemMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string; reason: string; isWaste: boolean }) =>
      removeOrderItem(orderId, order.orderVersion, itemId),
    onMutate: async ({ orderId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) => {
            if (o.id !== orderId) return o;
            const remaining = o.items.filter((i: any) => i.id !== itemId);
            const removed = o.items.find((i: any) => i.id === itemId)?.subtotal || 0;
            const newSub = Math.max(0, o.subtotal - removed);
            return { ...o, items: remaining, subtotal: newSub, totalAmount: Math.max(0, newSub + (o.deliveryFee || 0) - (o.discountAmount || 0)) };
          }),
        };
      });
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error(err.message?.includes("CONCURRENCY_CONFLICT") ? "Order modified by someone else." : "Failed to void item");
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["live-orders"] }),
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ orderId, tableNumber }: { orderId: string; tableNumber: string }) =>
      updateTableNumber(orderId, order.orderVersion, tableNumber),
    onMutate: async ({ orderId, tableNumber }) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) =>
        old?.data ? { ...old, data: old.data.map((o: any) => o.id === orderId ? { ...o, tableNumber } : o) } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error("Failed to update table");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["live-orders"] }),
  });

  const transferMutation = useMutation({
    mutationFn: ({ orderId, newTableId }: { orderId: string; newTableId: string }) =>
      transferTable(orderId, newTableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
      setIsTransferModalOpen(false);
      setIsSheetOpen(false);
      toast.success("Table transferred successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to transfer table"),
  });

  const assignRiderMutation = useMutation({
    mutationFn: (riderId: string) => assignRiderToOrder(order.id, order.orderVersion, riderId),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error || "Failed to assign rider"); return; }
      toast.success(`Rider ${res.riderName || ""} assigned`);
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onError: () => toast.error("Failed to assign rider"),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveLiveOrder(order.id, order.orderVersion),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) =>
        old?.data ? { ...old, data: old.data.filter((o: any) => o.id !== order.id) } : old
      );
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error(err.message?.includes("CONCURRENCY_CONFLICT") ? "Order modified by someone else." : "Failed to archive order");
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
      setIsSheetOpen(false);
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isPrintingKitchenSlip, setIsPrintingKitchenSlip] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const printReceipt = () => {
    setIsPrintingReceipt(true);
    setTimeout(() => {
      buildAndPrint(`receipt-${order.id}`);
      setIsPrintingReceipt(false);
    }, 0);
  };

  const printKitchenSlip = () => {
    setIsPrintingKitchenSlip(true);
    setTimeout(() => {
      buildAndPrint(`kitchen-slip-${order.id}`);
      setIsPrintingKitchenSlip(false);
    }, 0);
  };

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => {
      const cached = queryClient.getQueryData<{ data: LiveOrderProjection[] }>(["live-orders"]);
      const activeOrder = cached?.data?.find(o => o.id === order.id);
      return rejectLiveOrder(order.id, activeOrder?.orderVersion ?? order.orderVersion, reason);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const prev = queryClient.getQueryData(["live-orders"]);
      queryClient.setQueryData(["live-orders"], (old: any) =>
        old?.data ? { ...old, data: old.data.filter((o: any) => o.id !== order.id) } : old
      );
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      queryClient.setQueryData(["live-orders"], ctx?.prev);
      toast.error(err.message?.includes("CONCURRENCY_CONFLICT")
        ? "Order was modified by someone else. Refreshing..."
        : "Failed to reject order");
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["live-orders"] }); },
  });

  const getNextStatus = (current: OrderStatus): { label: string; status: OrderStatus } | null => {
    switch (current) {
      case "pending":          return { label: "Approve Order",     status: "approved" };
      case "approved":         return { label: "Start Preparing",   status: "preparing" };
      case "preparing":        return { label: "Mark as Ready",     status: "ready_for_pickup" };
      case "ready_for_pickup":
        if (order.orderType === "delivery") return { label: "Out for Delivery", status: "out_for_delivery" };
        return { label: "Complete Order", status: "delivered" };
      case "out_for_delivery": return { label: "Mark as Delivered", status: "delivered" };
      case "delayed":          return { label: "Back to Preparing", status: "preparing" };
      default:                 return null;
    }
  };

  const getPrevStatus = (current: OrderStatus): { label: string; status: OrderStatus } | null => {
    switch (current) {
      case "approved":         return { label: "Back to Pending",   status: "pending" };
      case "preparing":        return { label: "Back to Approved",  status: "approved" };
      case "ready_for_pickup": return { label: "Back to Preparing", status: "preparing" };
      case "out_for_delivery": return { label: "Back to Ready",     status: "ready_for_pickup" };
      default:                 return null;
    }
  };

  const nextAction = getNextStatus(order.status as OrderStatus);
  const prevAction = getPrevStatus(order.status as OrderStatus);

  const isDeliveryReadyNoRider =
    order.orderType === "delivery" &&
    order.status === "ready_for_pickup" &&
    !order.rider;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const isKitchen = role === "kitchen";
  const isDineIn   = order.orderType === "dine_in";

  const rounds = order.items.reduce((acc, item) => {
    const r = item.roundNumber || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(item);
    return acc;
  }, {} as Record<number, typeof order.items>);

  const isUpdated  = Object.keys(rounds).length > 1;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        data-kanban-card=""
        {...attributes}
        {...listeners}
        className={cn(
          "rounded-[4px] relative cursor-grab active:cursor-grabbing active:scale-105 overflow-hidden transition-all duration-300 pb-10 receipt-bottom",
          "drop-shadow-[0_3px_3px_rgba(0,0,0,0.1)] hover:drop-shadow-[0_5px_5px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)] border",
          "text-stone-950 dark:text-stone-100",
          // Semantic background tinting per status
          order.status === "pending"          && "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
          order.status === "approved"         && "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40",
          order.status === "preparing"        && "border-purple-300/60 dark:border-purple-800/40" && "bg-[#F3E7FF] dark:bg-purple-950/30",
          order.status === "ready_for_pickup" && "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40",
          order.status === "out_for_delivery" && "bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/40",
          order.status === "delivered"        && "bg-zinc-100/80 dark:bg-zinc-900/40 border-zinc-300/60 dark:border-zinc-700/40",
          order.status === "delayed"          && "bg-orange-50/80 dark:bg-orange-950/20 border-orange-300/60 dark:border-orange-800/40",
          // Fallback for other statuses
          !["pending","approved","preparing","ready_for_pickup","out_for_delivery","delivered","delayed"].includes(order.status) && "bg-white dark:bg-zinc-950 border-black/5 dark:border-white/5",
          isDragging && "opacity-50 ring-2 ring-primary shadow-2xl",
          isOverlay && "ring-2 ring-primary shadow-xl rotate-2",
          order.status === "delayed" && "ring-2 ring-orange-400",
        )}
        onClick={() => setIsSheetOpen(true)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col border-l-0 sm:border-l bg-background shadow-2xl">
              {/* ── Sheet Header ── */}
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
                            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer Table
                          </DropdownMenuItem>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer font-semibold rounded-none">
                              <Trash2 className="w-4 h-4 mr-2" /> Cancel Order
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the order and remove it from the active board.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none">Keep Order</AlertDialogCancel>
                              <AlertDialogAction className="rounded-none bg-rose-600 hover:bg-rose-700 text-white" onClick={() => { setVoidTarget({ type: "order" }); setIsVoidDialogOpen(true); }}>
                                Yes, Cancel Order
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {order.status === "pending" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-semibold rounded-none">
                                <AlertCircle className="w-4 h-4 mr-2" /> Reject Order
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-none">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Please provide a reason for rejecting this order (e.g., Out of Stock).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-2">
                                <Input 
                                  placeholder="Rejection Reason" 
                                  className="rounded-none"
                                  value={rejectReason} 
                                  onChange={(e) => setRejectReason(e.target.value)} 
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-none" onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                                  disabled={!rejectReason.trim()}
                                  onClick={() => {
                                    rejectMutation.mutate(rejectReason);
                                    setRejectReason("");
                                  }}
                                >
                                  Reject Order
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <div className="flex flex-col pr-4 gap-2">
                  <SheetTitle className="text-2xl font-black tracking-tight truncate">#{order.id}</SheetTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn("uppercase font-black tracking-widest text-[9px] px-1.5 py-0", getOrderTypeColor(order.orderType))}>
                      {order.orderType.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={cn("uppercase font-black tracking-widest text-[9px] px-1.5 py-0 border", borderColor)}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                    {isUpdated && (
                      <Badge className="uppercase font-black tracking-widest text-[9px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500 text-white border-0">
                        ✏ RECALL — {Object.keys(rounds).length} Rounds
                      </Badge>
                    )}
                    {order.status === "delayed" && (
                      <Badge className="uppercase font-black tracking-widest text-[9px] px-1.5 py-0 bg-yellow-400 text-yellow-900 border-0">
                        Delayed
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
                        <span className={cn("font-bold", new Date(order.estimatedReadyAt) < new Date() ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>
                          ETA: {new Date(order.estimatedReadyAt) < new Date() ? "Overdue" : format(new Date(order.estimatedReadyAt), "h:mm a")}
                        </span>
                      </>
                    )}
                  </SheetDescription>
                </div>
              </SheetHeader>

              {/* ── Sheet Body ── */}
              <div className="flex-1 overflow-y-auto p-5 sm:px-6 bg-background space-y-6">
                {/* Info Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-dashed">
                  {isDineIn ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <UtensilsCrossed className="w-3 h-3" /> Table Info
                        </div>
                        {isTableEditing ? (
                          <Input
                            value={editTableValue}
                            onChange={(e) => setEditTableValue(e.target.value)}
                            className="h-7 w-24 text-xs px-2 font-bold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { updateTableMutation.mutate({ orderId: order.id, tableNumber: editTableValue }); setIsTableEditing(false); }
                              if (e.key === "Escape") { setIsTableEditing(false); setEditTableValue(order.tableNumber || ""); }
                            }}
                            onBlur={() => {
                              if (editTableValue !== order.tableNumber) updateTableMutation.mutate({ orderId: order.id, tableNumber: editTableValue });
                              setIsTableEditing(false);
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn("font-bold text-base text-foreground", !isKitchen && "cursor-pointer hover:underline decoration-dashed decoration-primary/50 underline-offset-4")}
                              onClick={() => !isKitchen && setIsTableEditing(true)}
                            >
                              {order.tableNumber || "N/A"}
                            </span>
                            {order.tableHallType === "family" && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300">
                                Family Hall
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs font-medium text-muted-foreground">Waiter: {order.waiterName || "Unassigned"}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <UserCircle2 className="w-3 h-3" /> Customer
                        </div>
                        <div className="font-bold text-sm text-foreground capitalize truncate">{order.customerName || "Walk-in Guest"}</div>
                        {order.customerPhone && (
                          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {formatPhone(order.customerPhone)}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <UserCircle2 className="w-3 h-3" /> Customer
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
                            <a href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline leading-snug line-clamp-3" onClick={(e) => e.stopPropagation()}>
                              {order.deliveryAddress}
                            </a>
                          ) : (
                            <span className="font-semibold text-xs text-foreground leading-snug line-clamp-3">{order.deliveryAddress}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── Rider Assignment (delivery only, from ready_for_pickup onwards) ── */}
                {order.orderType === "delivery" && !isKitchen &&
                  ["ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status) && (
                  <div className="pb-5 border-b border-dashed space-y-2">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Bike className="w-3 h-3" /> Rider Assignment
                    </div>
                    {order.rider ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                            {order.rider.name?.charAt(0).toUpperCase() || "R"}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{order.rider.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPhone(order.rider.phone)}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
                        </div>
                        {/* Reassign */}
                        <Select
                          value=""
                          onValueChange={(id) => { setSelectedRiderId(id); assignRiderMutation.mutate(id); }}
                          disabled={assignRiderMutation.isPending}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs border-dashed">
                            <span className="text-muted-foreground text-xs">Reassign</span>
                          </SelectTrigger>
                          <SelectContent>
                            {ridersData?.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Select
                          value={selectedRiderId}
                          onValueChange={(id) => { setSelectedRiderId(id); assignRiderMutation.mutate(id); }}
                          disabled={assignRiderMutation.isPending}
                        >
                          <SelectTrigger className="h-9 w-full bg-amber-50 border-amber-300 text-amber-800 font-semibold text-sm">
                            {assignRiderMutation.isPending
                              ? <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Assigning...</span>
                              : <SelectValue placeholder="Select rider to assign..." />}
                          </SelectTrigger>
                          <SelectContent>
                            {!ridersData || ridersData.length === 0
                              ? <SelectItem value="_none" disabled>No riders available</SelectItem>
                              : ridersData.map(r => (
                                  <SelectItem key={r.id} value={r.id}>
                                    <span className="font-semibold">{r.name}</span>
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Assign a rider before dispatching this order
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Order Items ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" /> Order Details
                    </h3>
                    <Badge variant="secondary" className="ml-auto bg-muted font-bold text-[10px]">{order.items.length} items</Badge>
                  </div>

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
                            <div className={cn("text-[10px] uppercase font-bold tracking-widest pb-1 border-b flex items-center gap-2", addedRound ? "text-amber-700 border-amber-200" : "text-muted-foreground border-border")}>
                              Round {roundNum}
                              {addedRound && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">Added Later</span>}
                            </div>
                          )}
                          <div className="flex flex-col gap-3">
                            {roundItems.map((item) => {
                              const addOns = Array.isArray(item.selectedAddOns)
                                ? (item.selectedAddOns as { name: string; price?: number }[])
                                : [];
                              const canVoid = !isKitchen && !["preparing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status);
                              const isDeal = item.itemName.includes("[DEAL]");
                              const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
                              const dealSelections = isDeal && item.dealSelections ? item.dealSelections : null;
                              
                              return (
                                <div key={item.id} className="flex justify-between items-start">
                                  <div className="flex gap-3 flex-1 min-w-0">
                                    <div className="text-foreground font-black text-sm h-8 w-8 rounded border border-primary/30 bg-primary/5 flex items-center justify-center shrink-0">
                                      {item.quantity}×
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-base leading-tight text-foreground">
                                        {isDeal ? dealName : (
                                          <>
                                            {item.itemName}
                                            {item.variantName && item.variantName !== "Deal" && <span className="font-normal text-muted-foreground ml-1 text-sm">({item.variantName})</span>}
                                          </>
                                        )}
                                      </span>
                                      {isDeal && dealSelections && dealSelections.length > 0 && (
                                        <div className="text-xs font-semibold mt-2 space-y-1">
                                          {dealSelections.map((sel: any, idx: any) => (
                                            <div key={idx} className="text-amber-700 bg-amber-50/60 px-2 py-1 rounded">
                                              <span className="font-bold">Slot {idx + 1}:</span> {sel.name}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {isDeal && !dealSelections && item.specialInstructions && (
                                        <div className="text-xs font-semibold mt-2 space-y-1">
                                          {item.specialInstructions.split(" • ").map((itemLine, idx) => (
                                            <div key={idx} className="text-amber-700 bg-amber-50/60 px-2 py-1 rounded">
                                              {itemLine}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {!isDeal && addOns.length > 0 && (
                                        <span className="text-muted-foreground text-xs font-semibold mt-0.5">
                                          + {addOns.map((a) => String(a.name || "")).join(", ")}
                                        </span>
                                      )}
                                      {!isDeal && item.specialInstructions && !item.specialInstructions.startsWith("[DEAL:") && (
                                        <div className="flex items-start gap-1 mt-1 text-rose-500">
                                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                          <span className="text-xs font-bold leading-tight">{item.specialInstructions}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {!isKitchen && (
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                      {canVoid ? (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" aria-label={`Void ${item.itemName}`}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Void this item?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will remove &quot;{item.itemName}&quot; from the order and recalculate the bill.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => { setVoidTarget({ type: "item", itemId: item.id }); setIsVoidDialogOpen(true); }}>
                                                Void Item
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      ) : <div className="w-7" />}
                                      <span className="font-bold text-base text-right min-w-[60px]">Rs. {String(item.subtotal)}</span>
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

              {/* ── Sheet Footer ── */}
              {!isKitchen && (
                <div className="p-5 sm:px-6 border-t bg-background shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                  {/* Financials */}
                  <div className="flex flex-col gap-1 mb-4">
                    {(order.deliveryFee ?? 0) > 0 && (
                      <div className="flex justify-between text-muted-foreground text-xs font-semibold">
                        <span>Delivery Fee</span><span>Rs. {order.deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    {(order.discountAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 text-xs font-semibold">
                        <span>Discount</span><span>− Rs. {order.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end mt-1 pt-1 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">Total Bill</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 py-0 px-1.5 h-4">
                          <Banknote className="w-3 h-3" /> {order.paymentMethod || "Cash"}
                        </Badge>
                      </div>
                      <span className="text-3xl font-black text-primary tracking-tight">Rs. {order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Cash calculator */}
                  {(order.paymentMethod === "Cash" || order.paymentMethod === "COD") && order.paymentStatus === "paid" && (
                    <div className="mb-4 p-3 bg-muted/50 border space-y-2.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Cash Received</Label>
                      <div className="flex gap-1.5">
                        {([500, 1000, 5000] as const).map((amount) => (
                          <Button key={amount} type="button" variant={Number(cashTendered) === amount ? "default" : "outline"} size="sm" className="h-8 flex-1 text-xs font-bold rounded-none px-1" onClick={(e) => { e.stopPropagation(); setCashTendered(String(amount)); }}>
                            {amount}
                          </Button>
                        ))}
                      </div>
                      <Input type="number" placeholder={`Min Rs. ${order.totalAmount}`} value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} className="h-12 text-xl font-black text-right shadow-none rounded-none" min={order.totalAmount} onClick={(e) => e.stopPropagation()} />
                      {cashTendered !== "" && Number(cashTendered) >= order.totalAmount && (
                        <div className="flex justify-between items-center pt-2 border-t border-dashed">
                          <span className="text-sm font-bold text-muted-foreground">Change to Return</span>
                          <span className="text-2xl font-black text-emerald-600">Rs. {(Number(cashTendered) - order.totalAmount).toLocaleString()}</span>
                        </div>
                      )}
                      {cashTendered !== "" && Number(cashTendered) > 0 && Number(cashTendered) < order.totalAmount && (
                        <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold pt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Short by Rs. {(order.totalAmount - Number(cashTendered)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Always show Edit Order & Print Bill for all order types */}
                    <div className="flex gap-2 mb-1 w-full">
                      {!(role === "manager" && !["pending", "approved"].includes(order.status)) && (
                        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="shrink-0">
                          <ManualOrderDialog existingOrder={order}>
                            <Button variant="outline" className="h-10 px-3 font-bold text-sm rounded-none shadow-sm hover:shadow-md">
                              <Plus className="w-4 h-4 mr-1" /> Edit
                            </Button>
                          </ManualOrderDialog>
                        </div>
                      )}
                      {order.status === "approved" && (
                        <Button variant="secondary" className="shrink-0 h-10 px-3 font-bold text-sm rounded-none shadow-sm hover:shadow-md bg-orange-100 hover:bg-orange-200 text-orange-800" onClick={(e) => { e.stopPropagation(); printKitchenSlip(); }}>
                          <ChefHat className="w-4 h-4 mr-1" /> Slip
                        </Button>
                      )}
                      <Button variant="default" className="flex-1 h-10 font-bold text-sm rounded-none shadow-sm hover:shadow-md" onClick={(e) => { e.stopPropagation(); printReceipt(); }}>
                        <Printer className="w-4 h-4 mr-2" /> {isKitchen ? "Print KOT" : "Print Receipt"}
                      </Button>
                    </div>
                    {order.paymentStatus === "unpaid" && (
                      <Button variant="default" className="w-full h-10 font-bold text-sm shadow-md bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markPaidMutation.mutate(order.id)}>
                        <Banknote className="w-4 h-4 mr-2" /> Mark as Paid
                      </Button>
                    )}
                    {nextAction && (
                      <Button
                        className="w-full h-10 font-bold text-sm shadow-md transition-all"
                        disabled={isDeliveryReadyNoRider}
                        title={isDeliveryReadyNoRider ? "Assign a rider before dispatching" : undefined}
                        onClick={() => { onStatusChange?.(order.id, nextAction.status); setIsSheetOpen(false); }}
                      >
                        <CircleCheck className="w-4 h-4 mr-2" />
                        {nextAction.label}
                        {isDeliveryReadyNoRider && <span className="ml-2 text-[10px] opacity-70">(assign rider first)</span>}
                      </Button>
                    )}
                    {order.status === "delivered" && (
                      <Button
                        variant="secondary"
                        className="w-full h-10 font-bold text-sm shadow-md transition-all bg-rose-500 hover:bg-rose-600 text-white border-0"
                        onClick={() => archiveMutation.mutate()}
                        disabled={archiveMutation.isPending}
                      >
                        {archiveMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Archiving...</>
                        ) : (
                          <><Trash2 className="w-4 h-4 mr-2 opacity-70" /> Clear from Board</>
                        )}
                      </Button>
                    )}
                    {/* Bottom buttons removed to deduplicate Print UI */}
                    {prevAction && (
                      <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => { onStatusChange?.(order.id, prevAction.status); setIsSheetOpen(false); }}>
                        ← {prevAction.label}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Card Face ── */}
        <div className="p-0">

          {/* Row 1: Order ID + Time */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-dashed border-black/20 dark:border-white/20">
            <span className={cn("font-black tracking-tight leading-none", isKitchen ? "text-3xl" : "text-xl")}>#{order.id}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {order.status === "pending" && (
                (() => {
                  if (!order.createdAt) return null;
                  const diffMins = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
                  if (diffMins > 15) return <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" title="> 15 mins" />;
                  if (diffMins > 5) return <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="5-15 mins" />;
                  return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="< 5 mins" />;
                })()
              )}
              <div className="text-xs font-bold bg-muted/80 text-muted-foreground border border-black/5 dark:border-white/5 px-2 py-0.5 rounded whitespace-nowrap">
                <LiveTime date={order.createdAt || new Date()} /> ago
              </div>
              {order.estimatedReadyAt && (
                <div className={cn("text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap border", new Date(order.estimatedReadyAt) < new Date() ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20")}>
                  {new Date(order.estimatedReadyAt) < new Date() ? "Overdue" : format(new Date(order.estimatedReadyAt), "h:mm a")}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Status + Type — always on ONE line, no wrap */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-black/5 dark:border-white/5">
            <Badge className={cn("text-[11px] uppercase font-black tracking-widest px-2.5 py-0.5 text-white hover:text-white border-0 shrink-0", getBgColor(borderColor))}>
              {order.status === "delivered" && order.orderType === "dine_in" ? "Served" : order.status.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className={cn("text-[11px] uppercase font-black tracking-widest px-2.5 py-0.5 shrink-0", getOrderTypeColor(order.orderType))}>
              {order.orderType.replace(/_/g, " ")}
            </Badge>
            {order.paymentStatus === "paid" ? (
              <Badge className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-emerald-500 hover:bg-emerald-500 text-white border-0 shrink-0">Paid</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 text-red-600 border-red-500/30 bg-red-500/10 shrink-0">Unpaid</Badge>
            )}
            {isUpdated && (
              <Badge className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-amber-500 hover:bg-amber-500 text-white border-0 shrink-0">✏ Recall</Badge>
            )}
            {order.status === "delayed" && (
              <Badge className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-yellow-400 text-yellow-900 border-0 shrink-0">Delayed</Badge>
            )}
          </div>

          {/* Details block */}
          {!isKitchen && (
            <div className="px-4 py-2.5 space-y-2 border-b border-dashed border-black/20 dark:border-white/20">
              {isDineIn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                    <UtensilsCrossed className="h-4 w-4 shrink-0" />
                    <span className="truncate">{order.tableNumber || "N/A"}</span>
                    {order.tableHallType === "family" && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 shrink-0">Family</span>
                    )}
                    <span className="text-muted-foreground font-normal">•</span>
                    <span className="text-foreground font-semibold truncate">{order.waiterName || "Unassigned"}</span>
                  </div>
                  {(order.customerName && order.customerName !== "Walk-in Guest") && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="capitalize truncate">{order.customerName}</span>
                      {order.customerPhone && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="tabular-nums text-muted-foreground font-medium">{formatPhone(order.customerPhone)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="capitalize truncate">{order.customerName || "Walk-in Guest"}</span>
                  </div>
                  {order.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="tabular-nums">{formatPhone(order.customerPhone)}</span>
                    </div>
                  )}
                  {order.orderType === "delivery" && order.rider && (
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      <Bike className="h-3.5 w-3.5 shrink-0" />
                      <span>{order.rider.name}</span>
                    </div>
                  )}
                  {order.orderType === "delivery" && !order.rider && (
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>No rider assigned</span>
                    </div>
                  )}
                  {order.orderType === "delivery" && order.deliveryAddress && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium pt-2 border-t border-dashed border-black/20 dark:border-white/20">
                      <MapPin className="h-4 w-4 mt-0.5 text-primary/60 shrink-0" />
                      {order.latitude && order.longitude ? (
                        <a href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} target="_blank" rel="noopener noreferrer" className="leading-relaxed hover:underline text-blue-600 dark:text-blue-400 line-clamp-2" onClick={(e) => e.stopPropagation()}>
                          {order.deliveryAddress}
                        </a>
                      ) : (
                        <span className="leading-relaxed line-clamp-2">{order.deliveryAddress}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {order.source === "whatsapp" && (
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-green-700 bg-green-500/10 w-fit px-2 py-1 rounded">
                  <MessageCircle className="h-3 w-3" /> WhatsApp Order
                </div>
              )}
            </div>
          )}

          {isKitchen && isDineIn && (
            <div className="px-4 py-2.5 text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 border-b border-dashed border-black/20 dark:border-white/20">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              {order.tableNumber || "N/A"} • {order.waiterName || "Unassigned"}
            </div>
          )}

          {/* Items */}
          <div className={cn("px-4 py-3 space-y-2.5", isKitchen ? "pb-4" : "")}>
            {Object.entries(rounds).map(([roundNum, roundItems]) => (
              <div key={roundNum} className="space-y-2.5">
                {Object.keys(rounds).length > 1 && (
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5 mb-1">
                    <span>Round {roundNum}</span>
                    {Number(roundNum) > 1 && <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 uppercase">Added</span>}
                  </div>
                )}
                {roundItems.map((item) => {
                  const addOns = Array.isArray(item.selectedAddOns) ? (item.selectedAddOns as { name: string }[]) : [];
                  return (
                    <div key={item.id} className={cn("flex justify-between items-start gap-3", item.status === "served" && isKitchen ? "opacity-30 line-through" : "")}>
                      <div className="flex gap-2.5 min-w-0 flex-1">
                        <span className={cn("font-black shrink-0 leading-tight", isKitchen ? "text-2xl text-primary" : "text-base text-primary")}>{item.quantity}×</span>
                        <div className="flex flex-col min-w-0">
                          <span className={cn("font-bold leading-snug", isKitchen ? "text-xl" : "text-[17px]")}>
                            {item.itemName.replace(/^\[DEAL\]\s*/, "")}
                            {item.variantName && item.variantName !== "Combo Deal" && <span className="font-normal text-muted-foreground ml-1 text-[15px]">({item.variantName})</span>}
                          </span>
                          {addOns.length > 0 && <span className={cn("text-muted-foreground font-medium mt-0.5", isKitchen ? "text-base" : "text-sm")}>+ {addOns.map((a) => String(a.name || "")).join(", ")}</span>}
                          {item.specialInstructions && !item.specialInstructions.startsWith("[DEAL:") && (
                            <span className={cn("text-red-500 font-bold mt-0.5", isKitchen ? "text-base" : "text-sm")}>*** {item.specialInstructions}</span>
                          )}
                        </div>
                      </div>
                      {!isKitchen && <span className="text-[15px] font-black text-foreground whitespace-nowrap shrink-0">Rs. {String(item.subtotal)}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Card footer */}
          {!isKitchen && (
            <div className="px-4 pt-3 pb-2 border-t-2 border-dashed border-black/20 dark:border-white/20 space-y-2">
              {(order.deliveryFee ?? 0) > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span className="font-medium">Delivery</span>
                  <span className="font-semibold">Rs. {order.deliveryFee.toLocaleString()}</span>
                </div>
              )}
              {(order.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">Discount</span>
                  <span className="font-semibold">− Rs. {order.discountAmount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-2xl font-black text-primary">Rs. {order.totalAmount.toLocaleString()}</span>
              </div>
              {/* Always show Edit & Bill for all order types in summary view */}
              <div className="flex gap-2 pt-1.5 w-full">
                {!(role === "manager" && !["pending", "approved"].includes(order.status)) && (
                  <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="shrink-0">
                    <ManualOrderDialog existingOrder={order}>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </ManualOrderDialog>
                  </div>
                )}
                {order.status === "approved" && (
                  <Button variant="secondary" size="sm" className="shrink-0 text-xs h-8 px-2 bg-orange-100 hover:bg-orange-200 text-orange-800" onClick={(e) => { e.stopPropagation(); printKitchenSlip(); }}>
                    <ChefHat className="h-3 w-3 mr-1" /> Slip
                  </Button>
                )}
                <Button variant="default" size="sm" className="flex-1 text-xs h-8 rounded-none" onClick={(e) => { e.stopPropagation(); printReceipt(); }}>
                  <Printer className="h-3 w-3 mr-1" /> {isKitchen ? "KOT" : "Receipt"}
                </Button>
              </div>
            </div>
          )}

          {/* Subtle shadow limited to zig-zag bottom curves */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-black/25 dark:from-black/50 to-transparent" />
        </div>
      </div>

      {/* ── Transfer Modal ── */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Table</DialogTitle>
            <DialogDescription>Move this order to another free table in the same hall.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedTransferTableId} onValueChange={setSelectedTransferTableId}>
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue placeholder="Select new table..." />
              </SelectTrigger>
              <SelectContent>
                {tablesData
                  ?.filter(t => !t.isOccupied && (!order.tableHallType || t.hallType === order.tableHallType))
                  .map(table => (
                  <SelectItem key={table.id} value={table.id}>
                   {table.name}
                    {table.tableZone === "outdoor" ? " (OutDoor)" : ""}
                    {table.tableZone === "family"  ? " (Family Hall)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
            <Button disabled={!selectedTransferTableId || transferMutation.isPending} onClick={() => transferMutation.mutate({ orderId: order.id, newTableId: selectedTransferTableId })}>
              {transferMutation.isPending ? "Transferring..." : "Transfer Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hidden Receipt Template ── */}
      {isPrintingReceipt && (
        <div id={`receipt-${order.id}`} style={{ display: "none" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <img src={`${typeof window !== "undefined" ? window.location.origin : ""}/slip/FullLogo.png`} alt="Header" style={{ width: "80%", maxWidth: "250px", display: "block", margin: "0 auto 8px" }} />
          <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />
          
          {/* Order type */}
          <div style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>
            {order.orderType.replace("_", " ")}
          </div>
          
          {/* Table Number (if Dine In) */}
          {order.orderType === "dine_in" && (
            <div style={{ fontSize: "18px", fontWeight: "900", marginBottom: "8px" }}>
              {order.tableNumber ? (/^table/i.test(order.tableNumber) ? order.tableNumber : `Table ${order.tableNumber}`) : "Table N/A"}
              {order.tableZone === "family" ? " (Family Hall)" : order.tableZone === "outdoor" ? " (Outdoor)" : ""}
            </div>
          )}
          
          {/* Order number + recall + Date block */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "6px 0", marginBottom: "8px" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "20px", fontWeight: "900" }}>#{order.id.split("-").pop()}</div>
              {isUpdated && <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: "2px" }}>(Recall)</div>}
            </div>
            <div style={{ fontSize: "13px", textAlign: "right", fontWeight: "600", lineHeight: "1.4" }}>
              {format(order.createdAt || new Date(), "dd/MM/yyyy")}
              <br />
              {format(order.createdAt || new Date(), "hh:mm a")}
            </div>
          </div>
        </div>
        
        {/* Customer Info */}
        <div style={{ fontSize: "13px", marginBottom: "8px", textTransform: "capitalize", width: "100%" }}>
          {order.orderType === "delivery" ? (
            <>
              <div style={{ fontWeight: "900", fontSize: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {order.customerName || "Customer"}
              </div>
              {order.customerPhone && (
                <div style={{ fontWeight: "900", fontSize: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatPhone(order.customerPhone)}
                </div>
              )}
              {order.deliveryAddress && (
                <div style={{ fontWeight: "900", fontSize: "16px", marginTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {order.deliveryAddress}
                </div>
              )}
            </>
          ) : order.orderType === "dine_in" ? (
            <>
              <div style={{ fontSize: "14px", fontWeight: "700" }}>Waiter: {order.waiterName || "—"}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: "800", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {order.customerName || "Customer"}
              </div>
              {order.customerPhone && (
                <div style={{ fontWeight: "800", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatPhone(order.customerPhone)}
                </div>
              )}
            </>
          )}
        </div>

        {/* TABLE HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#ddd", color: "#000", padding: "6px 4px", fontSize: "14px", fontWeight: "bold", marginBottom: "6px", WebkitPrintColorAdjust: "exact", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
          <div style={{ width: "40px", textAlign: "left" }}>Qty</div>
          <div style={{ flex: 1, paddingLeft: "8px" }}>Product</div>
          <div style={{ width: "55px", textAlign: "right" }}>Price</div>
          <div style={{ width: "55px", textAlign: "right" }}>Sub</div>
        </div>

        {/* ITEMS */}
        <div style={{ margin: "5px 0" }}>
          {order.items.map((item, idx) => {
            const addOns = Array.isArray(item.selectedAddOns) ? (item.selectedAddOns as { name: string }[]) : [];
            const isDeal = item.itemName.includes("[DEAL]");
            const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
            const dealSelections = isDeal && item.dealSelections ? item.dealSelections : null;
            
            return (
              <div key={idx} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ width: "40px", fontSize: "20px", fontWeight: "900", textAlign: "left" }}>{item.quantity}x</div>
                  <div style={{ flex: 1, paddingLeft: "8px" }}>
                    <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>
                      {isDeal ? dealName : item.itemName}
                      {!isDeal && item.variantName && item.variantName !== "Deal" && <span style={{ fontWeight: "normal", fontSize: "14px" }}> ({item.variantName})</span>}
                    </div>
                    
                    {dealSelections && dealSelections.length > 0 && (
                      <div style={{ fontSize: "14px", color: "#333", marginBottom: "4px" }}>
                        {dealSelections.map((sel: any, i: number) => (
                          <div key={i}>• {sel.name}</div>
                        ))}
                      </div>
                    )}
                    {!isDeal && addOns.length > 0 && (
                      <div style={{ fontSize: "14px", color: "#333", marginBottom: "4px" }}>
                        + {addOns.map((a: any) => a.name).join(", ")}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
                        *** {item.specialInstructions}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>
                  <div style={{ width: "55px", textAlign: "right" }}>{(item.unitPrice || (item.subtotal/item.quantity)).toLocaleString()}</div>
                  <div style={{ width: "55px", textAlign: "right" }}>{item.subtotal.toLocaleString()}</div>
                </div>
                
                <div style={{ borderBottom: "1px solid #000" }} />
              </div>
            );
          })}
        </div>

        {/* TOTALS */}
        <div style={{ marginTop: "8px" }}>
          {(order.deliveryFee ?? 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>
              <div style={{ flex: 1, textAlign: "right" }}>Delivery Fee:</div>
              <div style={{ width: "70px", textAlign: "right" }}>Rs {order.deliveryFee.toLocaleString()}</div>
            </div>
          )}
          {(order.discountAmount ?? 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>
              <div style={{ flex: 1, textAlign: "right" }}>Discount:</div>
              <div style={{ width: "70px", textAlign: "right" }}>- Rs {order.discountAmount?.toLocaleString()}</div>
            </div>
          )}
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "900", marginTop: "8px" }}>
            <div style={{ textAlign: "right", flex: 1, paddingRight: "20px" }}>
              <div>Amount:</div>
              <div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px", ...(order.paymentStatus === 'paid' ? { padding: "2px 8px", backgroundColor: "#000", color: "#fff", display: "inline-block", borderRadius: "4px" } : {}) }}>
                {order.paymentStatus === "paid" ? `PAID (${order.paymentMethod})` : "Total Due"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>Rs {order.totalAmount.toLocaleString()}</div>
              {order.paymentStatus !== "paid" && (
                <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>Rs {order.totalAmount.toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Hidden Kitchen Slip Template ── */}
      {isPrintingKitchenSlip && (
        <div id={`kitchen-slip-${order.id}`} style={{ display: "none" }}>
          <div style={{ width: "80mm", margin: "0", padding: "8px", color: "#000", backgroundColor: "#fff", fontFamily: "sans-serif", fontSize: "14px", lineHeight: "1.2" }}>
            
            <div style={{ textAlign: "center", fontWeight: "900", fontSize: "24px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
              KOT
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4px", fontSize: "13px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>#{order.id.toUpperCase()}</span>
              </div>
              <span>{order.createdAt ? new Date(order.createdAt).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).replace(",", "") : "N/A"}</span>
            </div>

            <div style={{ borderBottom: "1px solid #000", marginBottom: "6px" }}></div>

            <div style={{ fontSize: "13px", marginBottom: "6px", lineHeight: "1.5" }}>
              <div style={{ display: "flex" }}>
                <span style={{ width: "85px" }}>Type</span>
                <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  : {order.orderType.replace("_", " ").toUpperCase()}
                  {isUpdated && <span>(Recall)</span>}
                </span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "85px" }}>Customer</span>
                <span style={{ textTransform: "capitalize" }}>: {order.customerName || "Walk-in"}</span>
              </div>
              {(order.orderType === "dine_in" || order.orderType === "dine-in") && (
                <div style={{ display: "flex" }}>
                  <span style={{ width: "85px" }}>Table No.</span>
                  <span>: {order.tableNumber || "N/A"} {order.tableZone ? `(${order.tableZone.toUpperCase()})` : ""}</span>
                </div>
              )}
            </div>

            <div style={{ borderBottom: "1px solid #000", marginBottom: "4px" }}></div>

            <table style={{ width: "100%", textAlign: "left", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "4px 0", fontWeight: "bold", width: "48px", textAlign: "center" }}>Sl.No</th>
                  <th style={{ padding: "4px 0 4px 8px", fontWeight: "bold", textAlign: "left" }}>Item Name</th>
                  <th style={{ padding: "4px 0", fontWeight: "bold", textAlign: "center", width: "48px" }}>Qty.</th>
                </tr>
              </thead>
            </table>

            <div style={{ borderBottom: "1px solid #000", marginBottom: "4px" }}></div>

            <table style={{ width: "100%", textAlign: "left", fontSize: "13px", borderCollapse: "collapse", marginBottom: "4px" }}>
              <tbody>
                {order.items.map((item, idx) => {
                  const isDeal = item.itemName.includes("[DEAL]");
                  const dealName = isDeal ? item.itemName.replace(/^\[DEAL\]\s*/, "") : null;
                  let dealSelections: any = null;
                  if (isDeal && item.dealSelections) {
                    try { dealSelections = typeof item.dealSelections === "string" ? JSON.parse(item.dealSelections) : item.dealSelections; } catch(e){}
                  }
                  let addOns: any = [];
                  if (item.selectedAddOns) {
                     try { addOns = Array.isArray(item.selectedAddOns) ? item.selectedAddOns : (typeof item.selectedAddOns === 'string' ? JSON.parse(item.selectedAddOns) : []); } catch(e) {}
                  }

                  return (
                    <tr key={idx} style={{ verticalAlign: "top" }}>
                      <td style={{ padding: "4px 0", width: "48px", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ padding: "4px 0 4px 8px", textAlign: "left" }}>
                        <div>
                          {isUpdated && <span style={{ fontWeight: "bold", marginRight: "4px" }}>[R{item.roundNumber || 1}]</span>}
                          {isDeal ? dealName : item.itemName}
                        </div>
                        {!isDeal && item.variantName && item.variantName !== "Deal" && (
                          <div>- {item.variantName}</div>
                        )}
                        
                        {isDeal && dealSelections && dealSelections.length > 0 && (
                          dealSelections.map((sel: any, i: number) => <div key={i} style={{ fontSize: "11px", color: "#374151", fontStyle: "italic" }}>- {sel.name}</div>)
                        )}
                        
                        {!isDeal && addOns.length > 0 && (
                          addOns.map((a: any, i: number) => <div key={i} style={{ fontSize: "11px", color: "#374151", fontStyle: "italic" }}>+ {a.name}</div>)
                        )}
                        
                        {!isDeal && item.specialInstructions && (
                          item.specialInstructions.split(" • ").map((inst, i) => (
                            <div key={i} style={{ fontSize: "11px", marginTop: "2px", fontWeight: "bold", textTransform: "uppercase", fontStyle: "italic" }}>
                              ** {inst}
                            </div>
                          ))
                        )}
                      </td>
                      <td style={{ padding: "4px 0", width: "48px", textAlign: "center" }}>{item.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ borderBottom: "1px solid #000", marginBottom: "6px" }}></div>

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", fontSize: "14px", marginBottom: "8px", paddingRight: "4px" }}>
              <span style={{ fontWeight: "bold", marginRight: "8px" }}>Total Items :</span>
              <span style={{ fontWeight: "bold", width: "40px", textAlign: "center" }}>
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>

            <div style={{ borderBottom: "1px dashed #000", marginTop: "8px" }}></div>
          </div>
        </div>
      )}

      <VoidReasonDialog
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        isItemLevel={voidTarget?.type === "item"}
        onConfirm={(reason, isWaste) => {
          if (voidTarget?.type === "order") cancelMutation.mutate({ id: order.id, reason, isWaste });
          else if (voidTarget?.type === "item" && voidTarget.itemId) voidItemMutation.mutate({ orderId: order.id, itemId: voidTarget.itemId, reason, isWaste });
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
    prevProps.order.rider?.name === nextProps.order.rider?.name &&
    prevProps.order.tableHallType === nextProps.order.tableHallType &&
    prevProps.order.tableId === nextProps.order.tableId &&
    prevProps.order.tableNumber === nextProps.order.tableNumber &&
    prevProps.isOverlay === nextProps.isOverlay &&
    prevProps.role === nextProps.role &&
    prevProps.borderColor === nextProps.borderColor
  );
});

function LiveTime({ date }: { date: Date | string }) {
  const [timeStr, setTimeStr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const update = () => setTimeStr(formatDistanceToNow(new Date(date)).replace("about ", ""));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [date]);

  if (!mounted) return <span>{formatDistanceToNow(new Date(date)).replace("about ", "")}</span>;
  return <span>{timeStr}</span>;
}
