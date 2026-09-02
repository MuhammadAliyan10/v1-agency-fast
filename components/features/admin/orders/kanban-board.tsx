"use client";

import { useQuery, useMutation, useQueryClient, focusManager } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { getLiveOrders, updateLiveOrderStatus, OrderStatus, LiveOrderProjection } from "@/server/actions/live-orders";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { ManualOrderDialog } from "./manual-order-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Volume2, VolumeX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Clock as ClockComponent } from "@/components/shared/clock";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LiveOrdersBoardProps {
  role: "admin" | "manager" | "kitchen" | "cashier";
}

const KITCHEN_COLUMNS: OrderStatus[] = ["preparing", "ready_for_pickup"];
const ADMIN_COLUMNS: OrderStatus[] = [
  "pending",
  "approved",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
];

export function LiveOrdersBoard({ role }: LiveOrdersBoardProps) {
  const isKitchen = role === "kitchen";
  const columns = isKitchen ? KITCHEN_COLUMNS : ADMIN_COLUMNS;
  
  const queryClient = useQueryClient();
  const [activeOrder, setActiveOrder] = useState<LiveOrderProjection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [etaDialog, setEtaDialog] = useState<{ isOpen: boolean; orderId: string | null; newStatus: OrderStatus | null; minutes: string }>({
    isOpen: false,
    orderId: null,
    newStatus: null,
    minutes: "30",
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch orders with polling
  const { data: result, isLoading } = useQuery({
    queryKey: ["live-orders"],
    queryFn: () => getLiveOrders(),
    refetchInterval: 5000, // Explicitly configure polling interval
  });

  // Pause polling when tab is hidden to save DB connections
  useEffect(() => {
    const handleVisibilityChange = () => {
      focusManager.setFocused(document.visibilityState === 'visible');
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const orders = result?.data || [];

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (typeFilter !== "all") {
      filtered = filtered.filter(o => o.orderType === typeFilter);
    }
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(q) || 
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q))
      );
    }
    
    return filtered;
  }, [orders, searchQuery, typeFilter]);

  // Audio Alert for New Orders
  const previousAlertCount = useRef(0);
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    const alertStatus = isKitchen ? "preparing" : "pending";
    const currentCount = orders.filter(o => o.status === alertStatus).length;
    
    if (hasInitialized.current && currentCount > previousAlertCount.current && !isMuted) {
      const audio = new Audio("/sounds/new-order-bell.mp3");
      audio.play().catch(err => console.log("Audio play blocked by browser:", err));
    }
    
    previousAlertCount.current = currentCount;
    hasInitialized.current = true;
  }, [orders, isKitchen, isMuted]);

  // Optimistic UI mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, currentVersion, status, etaMinutes }: { id: string; currentVersion: number; status: OrderStatus; etaMinutes?: number }) =>
      updateLiveOrderStatus(id, currentVersion, status, etaMinutes),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ["live-orders"] });
      const previous = queryClient.getQueryData(["live-orders"]);
      
      queryClient.setQueryData(["live-orders"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: LiveOrderProjection) =>
            o.id === newOrder.id ? { ...o, status: newOrder.status } : o
          ),
        };
      });
      return { previous };
    },
    onError: (err: any, newOrder, context) => {
      queryClient.setQueryData(["live-orders"], context?.previous);
      if (err.message && err.message.includes("CONCURRENCY_CONFLICT")) {
        toast.error("Order was modified by someone else. Refreshing...");
      } else if (err.message && err.message.includes("INVALID_STATE_TRANSITION")) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update status");
      }
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["live-orders"] });
    },
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleStatusChange = useCallback((orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Prompt for ETA if moving from pending to approved or preparing
    if (order.status === "pending" && (newStatus === "approved" || newStatus === "preparing")) {
      setEtaDialog({ isOpen: true, orderId, newStatus, minutes: "30" });
      return;
    }

    updateStatusMutation.mutate({ id: orderId, currentVersion: order.orderVersion, status: newStatus });
  }, [orders, updateStatusMutation]);

  const submitEtaDialog = () => {
    if (!etaDialog.orderId || !etaDialog.newStatus) return;
    const mins = parseInt(etaDialog.minutes, 10);
    
    const order = orders.find(o => o.id === etaDialog.orderId);
    if (!order) return;

    updateStatusMutation.mutate({ 
      id: etaDialog.orderId, 
      currentVersion: order.orderVersion,
      status: etaDialog.newStatus, 
      etaMinutes: isNaN(mins) ? undefined : mins 
    });
    
    setEtaDialog({ isOpen: false, orderId: null, newStatus: null, minutes: "30" });
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as string;
    let newStatus = over.id as OrderStatus;
    
    // If dropped over another card (useSortable), get the column status of that card
    const overOrder = orders.find(o => o.id === over.id);
    if (overOrder) {
      newStatus = overOrder.status as OrderStatus;
    }
    
    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
      handleStatusChange(orderId, newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-none pb-4 pt-2 w-full">
        {isKitchen ? (
          <div className="flex items-center justify-between bg-card border-b px-4 md:px-6 py-4 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Kitchen Display</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                size="sm" 
                variant={isMuted ? "outline" : "default"} 
                className="gap-2" 
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{isMuted ? "Alerts Muted" : "Alerts On"}</span>
              </Button>
              <ClockComponent className="text-sm font-semibold tabular-nums text-muted-foreground bg-muted px-3 py-1.5 border" />
            </div>
          </div>
        ) : (
          <PageHeader 
            heading="Live Orders" 
            description="Manage active orders and track kitchen operations" 
            className="mb-0"
          >
            <ManualOrderDialog>
              <Button size="sm" className="gap-1.5 h-9 hidden sm:flex">
                <Plus className="h-4 w-4" />
                New Order
              </Button>
            </ManualOrderDialog>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 h-9" 
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute new order alerts" : "Mute new order alerts"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-emerald-500" />}
              <span className="hidden sm:inline">{isMuted ? "Muted" : "Alerts On"}</span>
            </Button>
          </PageHeader>
        )}
        
        {/* Filters - Hidden in Kitchen */}
        {!isKitchen && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 mb-2">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, or phone..."
                className="pl-9 h-10 bg-card border shadow-sm focus-visible:ring-1 focus-visible:ring-primary text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)} className="bg-card border p-1 shadow-sm w-full sm:w-auto justify-start sm:justify-end overflow-x-auto scrollbar-none">
              <ToggleGroupItem value="all" className="h-8 px-4 text-xs font-bold data-[state=on]:bg-primary/10 data-[state=on]:text-primary">All Orders</ToggleGroupItem>
              <ToggleGroupItem value="dine_in" className="h-8 px-4 text-xs font-bold whitespace-nowrap data-[state=on]:bg-purple-500/10 data-[state=on]:text-purple-700 dark:data-[state=on]:text-purple-400">Dine-In</ToggleGroupItem>
              <ToggleGroupItem value="delivery" className="h-8 px-4 text-xs font-bold whitespace-nowrap data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-700 dark:data-[state=on]:text-orange-400">Delivery</ToggleGroupItem>
              <ToggleGroupItem value="pickup" className="h-8 px-4 text-xs font-bold whitespace-nowrap data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-700 dark:data-[state=on]:text-emerald-400">Pickup</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-auto pb-8 pt-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className={cn("flex gap-4 h-max min-h-[calc(100vh-220px)] items-stretch", isKitchen ? "w-full" : "w-max")}>
              {columns.map((colStatus) => (
                <KanbanColumn
                  key={colStatus}
                  status={colStatus}
                  orders={filteredOrders.filter((o) => o.status === colStatus)}
                  role={role}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
            <DragOverlay>
              {activeOrder ? (
                <KanbanCard order={activeOrder} role={role as any} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <Dialog open={etaDialog.isOpen} onOpenChange={(open) => !open && setEtaDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Preparation Time</DialogTitle>
            <DialogDescription>
              Provide an estimated time for this order to be ready. This will notify the customer via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minutes" className="text-right">
                Minutes
              </Label>
              <Input
                id="minutes"
                type="number"
                value={etaDialog.minutes}
                onChange={(e) => setEtaDialog(prev => ({ ...prev, minutes: e.target.value }))}
                className="col-span-3"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              {[15, 30, 45, 60].map(m => (
                <Button key={m} variant="outline" size="sm" onClick={() => setEtaDialog(prev => ({ ...prev, minutes: m.toString() }))}>
                  {m}m
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtaDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={submitEtaDialog} className="gap-2">
              <Clock className="h-4 w-4" />
              Confirm & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
