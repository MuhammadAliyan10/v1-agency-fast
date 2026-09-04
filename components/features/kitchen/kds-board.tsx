"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getKitchenOrders,
  updateKitchenItemStatus,
  bumpOrderItems,
  type KitchenOrder,
  type KitchenOrderItem,
} from "@/server/actions/kds";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChefHat, AlertCircle, Volume2, VolumeX, Printer } from "lucide-react";
import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { KotPrinter, type KotPrintData } from "./kot-printer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddOn {
  name: string;
  price?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Minimal silent notification ding (base64) so no external asset is needed
const DING_AUDIO =
  "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

// ---------------------------------------------------------------------------
// OrderCard
// ---------------------------------------------------------------------------

interface OrderCardProps {
  order: KitchenOrder;
  /** Shared clock tick from the parent — avoids N setInterval instances. */
  now: Date;
  updateItemMutation: ReturnType<typeof useMutation<unknown, Error, { itemId: string; status: "pending" | "preparing" | "served" }>>;
  bumpMutation: ReturnType<typeof useMutation<unknown, Error, string>>;
}

function OrderCard({ order, now, updateItemMutation, bumpMutation }: OrderCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `KOT-${order.id}`,
  });

  const orderTime = order.createdAt ? new Date(order.createdAt) : new Date();
  const minutesElapsed = differenceInMinutes(now, orderTime);

  // SLA colour logic — escalates: white → amber → critical red
  let cardClass = "bg-white text-black border-gray-300";
  let headerClass = "bg-gray-100 border-gray-300 text-black";
  let isCritical = false;

  if (minutesElapsed >= 10) {
    cardClass =
      "bg-red-600 text-white border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.5)]";
    headerClass = "bg-red-700 border-red-800 text-white";
    isCritical = true;
  } else if (minutesElapsed >= 5) {
    cardClass =
      "bg-amber-400 text-black border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.3)]";
    headerClass = "bg-amber-500 border-amber-600 text-black";
  }

  const activeItems = order.items.filter((i) => i.status !== "served");
  const allServed = activeItems.length === 0;

  if (allServed) {
    cardClass = "bg-gray-300 text-gray-500 opacity-50 grayscale";
    headerClass = "bg-gray-400 text-gray-600";
    isCritical = false;
  }

  const printData: KotPrintData = {
    orderId: order.id,
    customerName: order.customerName,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    items: order.items.map((i) => ({
      itemName: i.itemName,
      variantName: i.variantName,
      quantity: i.quantity,
      specialInstructions: i.specialInstructions,
      selectedAddOns: i.selectedAddOns,
    })),
    createdAt: order.createdAt,
  };

  const timeElapsedFormatted = formatDistanceToNowStrict(orderTime, {
    addSuffix: false,
  });

  return (
    <div
      className={cn(
        "border-2 overflow-hidden flex flex-col transition-colors duration-500",
        cardClass
      )}
    >
      {/* Hidden KOT print component */}
      <div className="hidden">
        <KotPrinter ref={printRef} data={printData} />
      </div>

      {/* Card Header */}
      <div
        className={cn(
          "p-4 border-b-2 flex justify-between items-center",
          headerClass
        )}
      >
        <div>
          <h3 className="font-black text-3xl leading-none">
            #{order.id.slice(-4)}
          </h3>
          <p className="font-bold text-sm uppercase tracking-wider mt-1 opacity-90">
            {order.orderType === "dine_in" && order.tableNumber
              ? `DINE-IN • TBL ${order.tableNumber}`
              : order.orderType.replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-black/10 text-current"
            onClick={() => handlePrint()}
            aria-label="Print KOT"
          >
            <Printer className="w-5 h-5" />
          </Button>
          <div
            className={cn(
              "font-black text-2xl tabular-nums",
              isCritical && "animate-pulse"
            )}
          >
            {timeElapsedFormatted}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {order.items.map((item: KitchenOrderItem) => {
          // Safely narrow selectedAddOns — the DB stores it as jsonb (unknown)
          const addOns: AddOn[] =
            Array.isArray(item.selectedAddOns)
              ? (item.selectedAddOns as AddOn[])
              : [];

          return (
            <div
              key={item.id}
              className={cn(
                "p-3 flex flex-col gap-2 transition-colors",
                item.status === "served"
                  ? "opacity-30 line-through"
                  : "bg-black/5"
              )}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-black text-2xl leading-tight">
                  <span className="mr-3 opacity-60">{item.quantity}x</span>
                  {item.itemName}
                </h4>

                {/* Per-item serve button */}
                {!allServed && item.status !== "served" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 border-2 border-current bg-transparent hover:bg-black/10 font-bold"
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        status: "served",
                      })
                    }
                    aria-label={`Mark ${item.itemName} as served`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {item.variantName && (
                <p className="text-lg font-bold opacity-80 pl-8">
                  └ {item.variantName}
                </p>
              )}

              {addOns.length > 0 && (
                <div className="pl-8">
                  {addOns.map((a, i) => (
                    <p key={i} className="text-sm font-bold opacity-75">
                      + {a.name}
                    </p>
                  ))}
                </div>
              )}

              {item.specialInstructions && (
                <div className="mt-1 pl-8">
                  {item.specialInstructions.startsWith("[DEAL:") ? (
                    <p className="text-lg font-black text-purple-100 bg-purple-700 p-2 inline-block uppercase border-2 border-purple-900 shadow-sm">
                      {item.specialInstructions}
                    </p>
                  ) : (
                    <p className="text-lg font-black text-red-600 bg-red-100 p-2 inline-block uppercase border-2 border-red-600">
                      {item.specialInstructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bump Button */}
      {!allServed && (
        <Button
          className="m-4 h-20 text-3xl font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 text-white shadow-xl transition-transform active:scale-95 border-b-8 border-green-800"
          onClick={() => bumpMutation.mutate(order.id)}
          disabled={bumpMutation.isPending}
        >
          Bump Order
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KDSBoard
// ---------------------------------------------------------------------------

export function KDSBoard() {
  const queryClient = useQueryClient();
  const [isMuted, setIsMuted] = useState(true);

  // ── Single shared clock ─────────────────────────────────────────────────
  // One interval for all cards instead of N intervals (one per card).
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Audio ref — initialised once on mount
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio(DING_AUDIO);
  }, []);

  // Track known order IDs to detect new arrivals
  const previousOrderIds = useRef<Set<string>>(new Set());

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ["kds-orders"],
    queryFn: async () => {
      const res = await getKitchenOrders();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 3_000, // Fast polling for real-time KDS
  });

  // New-order sound alert
  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.map((o) => o.id));
    let hasNew = false;
    currentIds.forEach((id) => {
      if (!previousOrderIds.current.has(id)) hasNew = true;
    });
    if (hasNew && !isMuted && audioRef.current) {
      audioRef.current
        .play()
        .catch(() => {/* Browser autoplay policy — user must interact first */});
    }
    previousOrderIds.current = currentIds;
  }, [data, isMuted]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: "pending" | "preparing" | "served";
    }) => {
      const res = await updateKitchenItemStatus(itemId, status);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["kds-orders"] }),
    onError: (err: Error) => toast.error(err.message || "Failed to update item"),
  });

  const bumpMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await bumpOrderItems(orderId);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onMutate: async (orderId) => {
      // Optimistic update — mark all items served immediately in the cache
      await queryClient.cancelQueries({ queryKey: ["kds-orders"] });
      queryClient.setQueryData<KitchenOrder[]>(["kds-orders"], (old) => {
        if (!old) return old;
        return old.map((order) =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map((i) => ({ ...i, status: "served" })),
              }
            : order
        );
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["kds-orders"] }),
    onError: () => toast.error("Failed to bump order"),
  });

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-white tracking-widest uppercase">
          KDS LIVE
        </h1>
        <Button
          variant={isMuted ? "outline" : "default"}
          className={cn("font-bold gap-2", !isMuted && "bg-blue-600 hover:bg-blue-700")}
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute order alerts" : "Mute order alerts"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          {isMuted ? "UNMUTE ALERTS" : "ALERTS ON"}
        </Button>
      </div>

      <div className="p-4 flex-1">
        {isLoading && (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-zinc-500 text-xl font-bold animate-pulse uppercase tracking-widest">
              Syncing Kitchen...
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-red-500 text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              Connection Lost
            </p>
          </div>
        )}

        {!isLoading && !error && data?.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-600 opacity-50">
            <ChefHat className="w-24 h-24 mb-6 opacity-30" />
            <h2 className="text-4xl font-black uppercase tracking-widest">
              Kitchen Clear
            </h2>
            <p className="text-lg font-bold mt-2">Waiting for orders...</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
          {data?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              updateItemMutation={updateItemMutation}
              bumpMutation={bumpMutation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
