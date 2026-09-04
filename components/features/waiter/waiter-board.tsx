"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWaiterFloorData, WaiterTableStatus, WaiterOrder } from "@/server/actions/waiter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  UtensilsCrossed, Clock, CheckCircle2, ChefHat, Users,
  Banknote, Receipt, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:          { label: "Waiting",  color: "text-amber-600 bg-amber-50 border-amber-200" },
  approved:         { label: "Approved", color: "text-blue-600 bg-blue-50 border-blue-200" },
  preparing:        { label: "Cooking",  color: "text-orange-600 bg-orange-50 border-orange-200" },
  ready_for_pickup: { label: "Ready",    color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: "text-muted-foreground bg-muted border-border" };
}

// Table card color scheme based on occupancy + kitchen status
function tableColors(table: WaiterTableStatus) {
  if (!table.isOccupied) {
    return {
      card: "bg-emerald-50 border-emerald-300 hover:border-emerald-500",
      num:  "text-emerald-700",
      dot:  "bg-emerald-400",
      hall: "bg-emerald-100 text-emerald-700",
    };
  }
  const topStatus = table.activeOrders[0]?.status ?? "pending";
  if (topStatus === "ready_for_pickup") {
    return {
      card: "bg-violet-50 border-violet-400 hover:border-violet-600 ring-2 ring-violet-300 ring-offset-1",
      num:  "text-violet-700",
      dot:  "bg-violet-500 animate-pulse",
      hall: "bg-violet-100 text-violet-700",
    };
  }
  if (topStatus === "preparing") {
    return {
      card: "bg-orange-50 border-orange-300 hover:border-orange-500",
      num:  "text-orange-700",
      dot:  "bg-orange-400",
      hall: "bg-orange-100 text-orange-700",
    };
  }
  return {
    card: "bg-rose-50 border-rose-300 hover:border-rose-500",
    num:  "text-rose-700",
    dot:  "bg-rose-400",
    hall: "bg-rose-100 text-rose-700",
  };
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({
  table,
  onClick,
}: {
  table: WaiterTableStatus;
  onClick: () => void;
}) {
  const c = tableColors(table);
  const order = table.activeOrders[0];
  const elapsed = order?.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: false }) : null;
  const itemCount = order?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const meta = order ? statusMeta(order.status) : null;

  return (
    <button
      type="button"
      onClick={table.isOccupied ? onClick : undefined}
      className={cn(
        "relative border-2 rounded-none p-0 overflow-hidden transition-all duration-150 select-none",
        "flex flex-col",
        table.isOccupied ? "cursor-pointer active:scale-[0.97]" : "cursor-default",
        c.card
      )}
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* Top bar — hall + status dot */}
      <div className="flex items-center justify-between px-2.5 pt-2.5">
        {table.hallType === "family" ? (
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-none", c.hall)}>
            Family
          </span>
        ) : (
          <span className="text-[9px] font-black uppercase tracking-widest text-transparent select-none">·</span>
        )}
        <div className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
      </div>

      {/* Table number — big */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
        <UtensilsCrossed className={cn("w-4 h-4 opacity-40", c.num)} />
        <span className={cn("font-black text-xl leading-none tracking-tight", c.num)}>
          {table.name.replace(/^(Family\s)?Table\s/i, "")}
        </span>
        {table.isOccupied && (
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", c.num)}>
            {table.name.startsWith("Family") ? "Family" : "Table"}
          </span>
        )}
      </div>

      {/* Bottom info strip */}
      <div className={cn("px-2.5 pb-2 text-center")}>
        {table.isOccupied && order ? (
          <div className="space-y-0.5">
            {meta && (
              <div className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border inline-block", meta.color)}>
                {meta.label}
              </div>
            )}
            <div className={cn("text-[10px] font-bold truncate max-w-full", c.num)}>
              {itemCount} item{itemCount !== 1 ? "s" : ""} · {elapsed}
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Free</span>
        )}
      </div>
    </button>
  );
}

// ─── Order detail sheet ───────────────────────────────────────────────────────

function TableDetailSheet({
  table,
  open,
  onClose,
}: {
  table: WaiterTableStatus | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!table) return null;
  const order = table.activeOrders[0];
  if (!order) return null;

  const meta = statusMeta(order.status);
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  // Group items by round
  const rounds = order.items.reduce((acc, item) => {
    const r = item.roundNumber || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(item);
    return acc;
  }, {} as Record<number, typeof order.items>);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[85vh] flex flex-col"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-5 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-2xl font-black tracking-tight">
                {table.name}
                {table.hallType === "family" && (
                  <span className="ml-2 text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 align-middle">
                    Family Hall
                  </span>
                )}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Order #{order.id}</p>
            </div>
            <div>
              <span className={cn("text-xs font-black uppercase tracking-widest px-2 py-1 border", meta.color)}>
                {meta.label}
              </span>
            </div>
          </div>

          {/* Customer + time */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{order.customerName || "Guest"}</span>
            </div>
            {order.customerPhone && (
              <span className="text-muted-foreground tabular-nums text-xs">{order.customerPhone}</span>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                {order.createdAt
                  ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                  : "—"}
              </span>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* Items — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {Object.entries(rounds)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([roundNum, roundItems]) => (
              <div key={roundNum}>
                {Object.keys(rounds).length > 1 && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                    Round {roundNum}
                    {Number(roundNum) > 1 && (
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px]">Added</span>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  {roundItems.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        {/* Kitchen status dot */}
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0 mt-1.5",
                          item.status === "served"    ? "bg-emerald-400" :
                          item.status === "preparing" ? "bg-orange-400"  : "bg-muted-foreground/30"
                        )} />
                        <div className="min-w-0">
                          <span className="font-bold text-sm">
                            {item.quantity}× {item.itemName.replace(/^\[DEAL\]\s*/, "")}
                          </span>
                          {item.variantName && item.variantName !== "Combo Deal" && (
                            <span className="text-muted-foreground text-xs ml-1">({item.variantName})</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap tabular-nums">
                        Rs. {item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <Separator />

        {/* Bill summary footer */}
        <div className="px-5 py-4 space-y-2 shrink-0 bg-muted/20">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            {order.discountAmount > 0 && (
              <span className="text-emerald-600 font-semibold">
                − Rs. {order.discountAmount.toLocaleString()} discount
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">Total Bill</span>
              <span className="text-xs text-muted-foreground font-semibold border px-1.5 py-0.5 bg-background">
                {order.paymentMethod}
              </span>
            </div>
            <span className="text-3xl font-black text-primary tracking-tight tabular-nums">
              Rs. {order.totalAmount.toLocaleString()}
            </span>
          </div>
          {/* Payment status pill */}
          <div className="flex justify-end">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border",
              order.paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}>
              {order.paymentStatus === "paid" ? "Paid" : "Unpaid — collect at close"}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Legend chip ─────────────────────────────────────────────────────────────

function LegendChip({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function WaiterBoard() {
  const [selectedTable, setSelectedTable] = useState<WaiterTableStatus | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["waiter-floor"],
    queryFn: getWaiterFloorData,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 3000,
  });

  // Track network status
  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  // Track last successful fetch
  useEffect(() => {
    if (data?.success) setLastRefresh(new Date());
  }, [data]);

  const tables = data?.data ?? [];
  const generalTables = tables.filter(t => t.hallType === "general");
  const familyTables  = tables.filter(t => t.hallType === "family");

  const occupiedCount = tables.filter(t => t.isOccupied).length;
  const freeCount     = tables.filter(t => !t.isOccupied).length;
  const readyCount    = tables.filter(t => t.activeOrders[0]?.status === "ready_for_pickup").length;

  const handleTableClick = useCallback((table: WaiterTableStatus) => {
    setSelectedTable(table);
    setSheetOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ChefHat className="w-8 h-8 text-muted-foreground animate-pulse" />
        <p className="text-sm font-semibold text-muted-foreground">Loading floor map...</p>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm font-semibold text-destructive">Failed to load tables.</p>
        <button
          onClick={() => refetch()}
          className="text-xs underline text-muted-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <LegendChip dot="bg-emerald-400" label={`${freeCount} Free`} />
          <LegendChip dot="bg-rose-400"    label={`${occupiedCount} Occupied`} />
          {readyCount > 0 && (
            <LegendChip dot="bg-violet-500 animate-pulse" label={`${readyCount} Ready to serve`} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOnline
            ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-rose-500" />}
          <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
            {format(lastRefresh, "h:mm:ss a")}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* General Hall */}
      {generalTables.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">General Hall</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">{generalTables.length} tables</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {generalTables.map(table => (
              <TableCard key={table.id} table={table} onClick={() => handleTableClick(table)} />
            ))}
          </div>
        </section>
      )}

      {/* Family Hall */}
      {familyTables.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-amber-700">Family Hall</span>
            <div className="flex-1 h-px bg-amber-200" />
            <span className="text-[10px] text-amber-600">{familyTables.length} tables</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {familyTables.map(table => (
              <TableCard key={table.id} table={table} onClick={() => handleTableClick(table)} />
            ))}
          </div>
        </section>
      )}

      {/* Detail sheet (read-only) */}
      <TableDetailSheet
        table={selectedTable}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
