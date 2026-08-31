// components/features/admin/orders/live-kanban.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import useSound from "use-sound";
import { Bell, BellOff, RefreshCw, Clock, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getLiveOrders,
  updateLiveOrderStatus,
  getAvailableRiders,
  assignRiderToOrder,
  markOrderPaid,
  type OrderStatus,
} from "@/server/actions/live-orders";
import { OrderCard } from "./order-card";
import { OrderDetailsSheet } from "./order-details-sheet";
import { ManualOrderDialog } from "./manual-order-dialog";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

const ETA_PRESETS = [10, 15, 20, 25, 30, 45];

const COLUMN_CONFIG = [
  {
    id: "pending",
    title: "New Orders",
    description: "Tap a card to start preparing",
    statuses: ["pending", "approved"],
    emptyLabel: "No pending orders",
    emptyDesc: "New orders from customers will appear here",
    headerClass: "text-amber-700 dark:text-amber-400",
    countClass: "bg-amber-500 text-white",
    bgClass: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30",
  },
  {
    id: "preparing",
    title: "Preparing",
    description: "Kitchen is actively working",
    statuses: ["preparing", "ready_for_pickup"],
    emptyLabel: "Nothing preparing",
    emptyDesc: "Move orders here when the kitchen starts",
    headerClass: "text-blue-700 dark:text-blue-400",
    countClass: "bg-blue-500 text-white",
    bgClass: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-800/30",
  },
  {
    id: "out_for_delivery",
    title: "Out for Delivery",
    description: "On the way to customers",
    statuses: ["out_for_delivery", "delayed"],
    emptyLabel: "No active deliveries",
    emptyDesc: "Orders sent out will appear here",
    headerClass: "text-emerald-700 dark:text-emerald-400",
    countClass: "bg-emerald-500 text-white",
    bgClass: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30",
  },
];

export function LiveKanban() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [availableRiders, setAvailableRiders] = useState<{ id: string; name: string; phone?: string | null }[]>([]);

  // ETA Dialog State
  const [etaDialogOpen, setEtaDialogOpen] = useState(false);
  const [etaOrderId, setEtaOrderId] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [customEta, setCustomEta] = useState("");

  const knownOrderIds = useRef<Set<string>>(new Set());
  const [playAlert] = useSound("/sounds/new-order-bell.mp3", { volume: 0.5 });

  const fetchOrders = async () => {
    const res = await getLiveOrders();
    if (res.success && res.data) {
      const incomingIds = new Set(res.data.map((o) => o.id));

      if (isAlertsEnabled && knownOrderIds.current.size > 0) {
        let hasNewOrder = false;
        incomingIds.forEach((id) => {
          if (!knownOrderIds.current.has(id)) hasNewOrder = true;
        });
        if (hasNewOrder) {
          playAlert();
          toast.info("New order arrived!", { icon: "🔔" });
        }
      }

      knownOrderIds.current = incomingIds;
      setOrders(res.data);
      setLastRefresh(new Date());
    }
  };

  const fetchRiders = async () => {
    const res = await getAvailableRiders();
    if (res.success && res.data) {
      setAvailableRiders(res.data as { id: string; name: string; phone?: string | null }[]);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
    fetchRiders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [isAlertsEnabled]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, providedEta?: number) => {
    if (newStatus === "preparing" && providedEta === undefined) {
      setEtaOrderId(orderId);
      setEtaMinutes(20);
      setCustomEta("");
      setEtaDialogOpen(true);
      return;
    }

    setUpdatingId(orderId);

    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
    }

    const res = await updateLiveOrderStatus(orderId, newStatus, providedEta);
    if (res.success) {
      const statusLabels: Record<string, string> = {
        pending: "Pending",
        approved: "Approved",
        preparing: "Preparing",
        ready_for_pickup: "Ready for Pickup",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        cancelled: "Cancelled",
        rejected: "Rejected",
        delayed: "Delayed",
      };
      toast.success(`Order moved to ${statusLabels[newStatus] ?? newStatus}`);
    } else {
      toast.error("Failed to update status. Reverting.");
      await fetchOrders();
    }

    setUpdatingId(null);

    if (selectedOrder?.id === orderId && ["delivered", "cancelled", "rejected"].includes(newStatus)) {
      setIsSheetOpen(false);
    }
  };

  const handleConfirmEta = async () => {
    if (!etaOrderId) return;
    const finalEta = customEta ? parseInt(customEta) : etaMinutes;
    setEtaDialogOpen(false);
    await handleUpdateStatus(etaOrderId, "preparing", finalEta > 0 ? finalEta : undefined);
    setEtaOrderId(null);
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    setUpdatingId(orderId);

    const rider = availableRiders.find((r) => r.id === riderId);
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, rider: rider ? { name: rider.name, phone: rider.phone } : null } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev: any) => ({ ...prev, rider: rider ? { name: rider.name, phone: rider.phone } : null }));
    }

    const res = await assignRiderToOrder(orderId, riderId);
    if (res.success) {
      toast.success("Rider assigned. Opening WhatsApp...");
    } else {
      toast.error("Failed to assign rider");
      await fetchOrders();
    }

    setUpdatingId(null);

    // Return riderPhone for WhatsApp link in the sheet
    return { riderPhone: res.success ? (res as any).riderPhone ?? null : null, riderName: res.success ? (res as any).riderName ?? null : null };
  };

  const handleMarkPaid = async (orderId: string) => {
    setUpdatingId(orderId);
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, paymentStatus: "paid" } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev: any) => ({ ...prev, paymentStatus: "paid" }));
    }
    
    const res = await markOrderPaid(orderId);
    if (res.success) {
      toast.success("Order marked as paid");
    } else {
      toast.error("Failed to mark as paid");
      await fetchOrders();
    }
    setUpdatingId(null);
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  if (!isMounted) return null;

  const isUpdating = updatingId !== null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Kitchen Command Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Auto-refreshes every 10s · Last:{" "}
            {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            className="gap-2 rounded-sm"
            onClick={() => setIsManualOrderOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Order
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrders}
            disabled={isUpdating}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 border-l border-border pl-3">
            {isAlertsEnabled ? (
              <Bell className="w-4 h-4 text-primary" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <Switch id="alerts-mode" checked={isAlertsEnabled} onCheckedChange={setIsAlertsEnabled} />
            <Label htmlFor="alerts-mode" className="cursor-pointer text-sm font-medium select-none">
              Audio Alerts
            </Label>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 min-h-0 pb-6 overflow-auto">
        {COLUMN_CONFIG.map((col) => {
          const colOrders = orders.filter((o) => col.statuses.includes(o.status));
          return (
            <div key={col.id} className={`flex flex-col rounded-xl border p-4 gap-3 ${col.bgClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-bold text-sm ${col.headerClass}`}>{col.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{col.description}</p>
                </div>
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${col.countClass}`}
                >
                  {colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 flex-1 min-h-[200px]">
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center py-10 rounded-lg border border-dashed border-border/50">
                    <Clock className="w-6 h-6 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">{col.emptyLabel}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-[150px]">{col.emptyDesc}</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      onClick={() => openOrderDetails(order)}
                      isUpdating={isUpdating}
                      updatingId={updatingId}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailsSheet
        order={selectedOrder}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onUpdateStatus={handleUpdateStatus}
        onMarkPaid={handleMarkPaid}
        isUpdating={isUpdating}
        availableRiders={availableRiders}
        onAssignRider={handleAssignRider}
      />

      <ManualOrderDialog
        open={isManualOrderOpen}
        onOpenChange={(open) => {
          setIsManualOrderOpen(open);
          if (!open) fetchOrders(); // Refresh kanban after new order
        }}
      />

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
            <Button onClick={handleConfirmEta} className="gap-2">
              <ChefHat className="w-4 h-4" />
              Start Preparing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
