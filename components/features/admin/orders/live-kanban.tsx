"use client";

import { useState, useEffect, useRef } from "react";
import useSound from "use-sound";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getLiveOrders, updateLiveOrderStatus, type OrderStatus } from "@/server/actions/live-orders";
import { OrderCard } from "./order-card";
import { OrderDetailsSheet } from "./order-details-sheet";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export function LiveKanban() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Track known IDs to detect newly arrived orders
  const knownOrderIds = useRef<Set<string>>(new Set());

  // Only load the sound if it exists. Fallback handles missing file gracefully in use-sound.
  const [playAlert] = useSound("/sounds/new-order-bell.mp3", { volume: 0.5 });

  const fetchOrders = async () => {
    const res = await getLiveOrders();
    if (res.success && res.data) {
      const incomingIds = new Set(res.data.map(o => o.id));
      
      // Detect new orders for audio alert
      if (isAlertsEnabled && knownOrderIds.current.size > 0) {
        let hasNewOrder = false;
        incomingIds.forEach(id => {
          if (!knownOrderIds.current.has(id)) hasNewOrder = true;
        });
        
        if (hasNewOrder) {
          playAlert();
          toast.info("New order arrived!");
        }
      }
      
      knownOrderIds.current = incomingIds;
      setOrders(res.data);
    }
  };

  // Initial fetch and polling setup (10s)
  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [isAlertsEnabled]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true);
    
    // Optimistic Update
    setOrders(currentOrders => 
      currentOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );

    const res = await updateLiveOrderStatus(orderId, newStatus);
    if (res.success) {
      toast.success(`Order #${orderId} moved to ${newStatus}`);
    } else {
      toast.error("Failed to update status");
      await fetchOrders(); // revert on failure
    }
    setIsUpdating(false);
    
    // Close sheet if it's the active one being updated to a state that might remove it from kanban
    if (selectedOrder?.id === orderId && ["delivered", "cancelled", "rejected"].includes(newStatus)) {
      setIsSheetOpen(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // Dropped in the same column

    let newStatus: OrderStatus;
    if (destination.droppableId === "pending") newStatus = "pending";
    else if (destination.droppableId === "preparing") newStatus = "preparing";
    else if (destination.droppableId === "ready") newStatus = "out_for_delivery";
    else return;

    await handleUpdateStatus(draggableId, newStatus);
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  // Column filtering
  const pendingOrders = orders.filter(o => ["pending", "approved"].includes(o.status));
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const readyOrders = orders.filter(o => ["out_for_delivery", "delayed"].includes(o.status));

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full gap-4 kanban-board">
      <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border">
        <div>
          <h2 className="text-lg font-bold">Kitchen Command Center</h2>
          <p className="text-sm text-muted-foreground">Auto-refreshes every 10 seconds. Drag and drop orders to update status.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Bell className={`w-4 h-4 ${isAlertsEnabled ? "text-primary" : "text-muted-foreground"}`} />
          <Switch 
            id="alerts-mode" 
            checked={isAlertsEnabled}
            onCheckedChange={setIsAlertsEnabled}
          />
          <Label htmlFor="alerts-mode" className="cursor-pointer font-medium">Audio Alerts</Label>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start h-full pb-10">
          {/* Column 1: Pending */}
          <Droppable droppableId="pending">
            {(provided) => (
              <div 
                className="flex flex-col gap-4 bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 min-h-[500px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-orange-600 dark:text-orange-400">New / Pending</h3>
                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {pendingOrders.length}
                  </span>
                </div>
                {pendingOrders.map((order, index) => (
                  <Draggable key={order.id} draggableId={order.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? "opacity-90 rotate-2 scale-105 transition-transform z-50 relative" : ""}
                        style={provided.draggableProps.style}
                      >
                        <OrderCard 
                          order={order} 
                          onUpdateStatus={handleUpdateStatus}
                          onClick={() => openOrderDetails(order)}
                          isUpdating={isUpdating}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Column 2: Preparing */}
          <Droppable droppableId="preparing">
            {(provided) => (
              <div 
                className="flex flex-col gap-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10 min-h-[500px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-yellow-600 dark:text-yellow-400">Preparing</h3>
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {preparingOrders.length}
                  </span>
                </div>
                {preparingOrders.map((order, index) => (
                  <Draggable key={order.id} draggableId={order.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? "opacity-90 rotate-2 scale-105 transition-transform z-50 relative" : ""}
                        style={provided.draggableProps.style}
                      >
                        <OrderCard 
                          order={order} 
                          onUpdateStatus={handleUpdateStatus}
                          onClick={() => openOrderDetails(order)}
                          isUpdating={isUpdating}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Column 3: Ready / Out */}
          <Droppable droppableId="ready">
            {(provided) => (
              <div 
                className="flex flex-col gap-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 min-h-[500px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-blue-600 dark:text-blue-400">Ready / Out</h3>
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {readyOrders.length}
                  </span>
                </div>
                {readyOrders.map((order, index) => (
                  <Draggable key={order.id} draggableId={order.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? "opacity-90 rotate-2 scale-105 transition-transform z-50 relative" : ""}
                        style={provided.draggableProps.style}
                      >
                        <OrderCard 
                          order={order} 
                          onUpdateStatus={handleUpdateStatus}
                          onClick={() => openOrderDetails(order)}
                          isUpdating={isUpdating}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      <OrderDetailsSheet 
        order={selectedOrder} 
        open={isSheetOpen} 
        onOpenChange={setIsSheetOpen} 
      />
    </div>
  );
}
