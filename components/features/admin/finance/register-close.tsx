// components/features/admin/finance/register-close.tsx
"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Banknote,
  Smartphone,
  Bike,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Receipt,
  Wallet,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { markOrderPaid } from "@/server/actions/finance";
import { toast } from "sonner";
import type {
  RegisterCloseData,
  RiderCashEntry,
  WaiterCashEntry,
  UnpaidOrder,
} from "@/server/actions/finance";

// ─── Payment method colour map ────────────────────────────────────────────────
const METHOD_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Cash:      { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200", dot: "bg-emerald-500"  },
  COD:       { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200", dot: "bg-emerald-500"  },
  JazzCash:  { bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-200",  dot: "bg-violet-500"   },
  EasyPaisa: { bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200",    dot: "bg-teal-500"     },
  Card:      { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200",    dot: "bg-blue-500"     },
  Bank:      { bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200",  dot: "bg-indigo-500"   },
};

function methodCls(method: string) {
  return METHOD_COLORS[method] ?? { bg: "bg-zinc-50", text: "text-zinc-700", border: "border-zinc-200", dot: "bg-zinc-500" };
}

// ─── Reusable: collapsible section wrapper ────────────────────────────────────
function Section({
  title,
  subtitle,
  amount,
  icon: Icon,
  variant = "default",
  children,
  defaultOpen = false,
  collapsible = false,
  badge,
}: {
  title: string;
  subtitle?: string;
  amount?: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
  children?: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const variantStyles = {
    default: { wrap: "border-border bg-card",           icon: "bg-primary/10 text-primary",        amount: "text-foreground"    },
    success: { wrap: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400", amount: "text-emerald-700 dark:text-emerald-400" },
    warning: { wrap: "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10",   icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",   amount: "text-amber-700 dark:text-amber-400"   },
    danger:  { wrap: "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/10",     icon: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400",     amount: "text-rose-700 dark:text-rose-400"     },
  };
  const s = variantStyles[variant];

  return (
    <div className={cn("border overflow-hidden", s.wrap)}>
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between px-5 py-4 text-left transition-colors",
          collapsible ? "hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer" : "cursor-default"
        )}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("p-2 shrink-0", s.icon)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm">{title}</p>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {amount !== undefined && (
            <span className={cn("text-xl font-black tabular-nums", s.amount)}>
              Rs.&nbsp;{amount.toLocaleString()}
            </span>
          )}
          {collapsible && (
            open
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {(!collapsible || open) && children && (
        <div className="border-t border-inherit">{children}</div>
      )}
    </div>
  );
}

// ─── Payment method breakdown row ─────────────────────────────────────────────
function MethodRow({ method, paid, unpaid, orderCount }: { method: string; paid: number; unpaid: number; orderCount: number }) {
  const c = methodCls(method);
  const total = paid + unpaid;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 100;

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
      <div className={cn("flex items-center gap-2 w-32 shrink-0")}>
        <div className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
        <span className={cn("text-xs font-black uppercase tracking-wider px-2 py-0.5 border", c.bg, c.text, c.border)}>
          {method}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{orderCount} order{orderCount !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-5 text-sm shrink-0">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 leading-none mb-0.5">Paid</p>
          <p className="font-black text-emerald-700">Rs.&nbsp;{paid.toLocaleString()}</p>
        </div>
        {unpaid > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 leading-none mb-0.5">Credit</p>
            <p className="font-black text-rose-600">Rs.&nbsp;{unpaid.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rider card ───────────────────────────────────────────────────────────────
function RiderCard({ entry, onCollected }: { entry: RiderCashEntry; onCollected: (riderId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initials = entry.riderName.charAt(0).toUpperCase();

  const handleCollectAll = () => {
    startTransition(async () => {
      // Mark all rider's orders as paid
      const results = await Promise.all(entry.orders.map(o => markOrderPaid(o.id)));
      const allOk = results.every(r => r.success);
      if (allOk) {
        toast.success(`All cash collected from ${entry.riderName}`);
        onCollected(entry.riderId);
      } else {
        toast.error("Some orders could not be marked paid — try again");
      }
    });
  };

  return (
    <div className="border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black shrink-0 dark:bg-amber-900/40 dark:text-amber-400">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{entry.riderName}</p>
          <p className="text-xs text-muted-foreground">
            {entry.orderCount} delivery order{entry.orderCount !== 1 ? "s" : ""} · cash not collected
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-black text-base text-amber-700 dark:text-amber-400">
            Rs.&nbsp;{entry.totalCash.toLocaleString()}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleCollectAll}
            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Collected
          </Button>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="p-1 hover:bg-muted/50 rounded transition-colors"
          >
            {open
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-amber-50/50 dark:bg-amber-950/10 px-5 pb-3 space-y-1">
          {entry.orders.map(o => (
            <div key={o.id} className="flex justify-between items-center text-xs py-1.5 border-b border-amber-100 dark:border-amber-900/30 last:border-0">
              <span className="font-mono font-bold text-amber-900 dark:text-amber-300">#{o.id}</span>
              <span className="text-muted-foreground truncate max-w-[160px] mx-3">{o.customerName}</span>
              <span className={cn("text-[9px] font-black px-1.5 py-0.5 border uppercase mr-2", methodCls(o.paymentMethod).bg, methodCls(o.paymentMethod).text, methodCls(o.paymentMethod).border)}>
                {o.paymentMethod}
              </span>
              <span className="font-black text-amber-700 dark:text-amber-400">Rs.&nbsp;{o.totalAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Waiter card ──────────────────────────────────────────────────────────────
function WaiterCard({ entry, onCollected }: { entry: WaiterCashEntry; onCollected: (waiterId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initials = entry.waiterName.charAt(0).toUpperCase();

  const handleCollectAll = () => {
    startTransition(async () => {
      const results = await Promise.all(entry.orders.map(o => markOrderPaid(o.id)));
      const allOk = results.every(r => r.success);
      if (allOk) {
        toast.success(`Cash reconciled for ${entry.waiterName}`);
        onCollected(entry.waiterId);
      } else {
        toast.error("Some orders could not be marked paid — try again");
      }
    });
  };

  return (
    <div className="border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 dark:bg-blue-900/40 dark:text-blue-400">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{entry.waiterName}</p>
          <p className="text-xs text-muted-foreground">
            {entry.orderCount} counter order{entry.orderCount !== 1 ? "s" : ""} · not reconciled
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-black text-base text-blue-700 dark:text-blue-400">
            Rs.&nbsp;{entry.totalCash.toLocaleString()}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleCollectAll}
            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Reconciled
          </Button>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="p-1 hover:bg-muted/50 rounded transition-colors"
          >
            {open
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-blue-50/50 dark:bg-blue-950/10 px-5 pb-3 space-y-1">
          {entry.orders.map(o => (
            <div key={o.id} className="flex justify-between items-center text-xs py-1.5 border-b border-blue-100 dark:border-blue-900/30 last:border-0">
              <span className="font-mono font-bold text-blue-900 dark:text-blue-300">#{o.id}</span>
              <span className="text-muted-foreground truncate max-w-[150px] mx-3">{o.customerName}</span>
              <Badge variant="outline" className="text-[9px] capitalize mr-2">{o.orderType.replace("_", " ")}</Badge>
              <span className="font-black text-blue-700 dark:text-blue-400">Rs.&nbsp;{o.totalAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Credit order row ─────────────────────────────────────────────────────────
function CreditRow({ order, onMarkPaid }: { order: UnpaidOrder; onMarkPaid: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const c = methodCls(order.paymentMethod);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 border-b border-border/30 last:border-0 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono font-black text-xs">#{order.id}</span>
          <Badge variant="outline" className="text-[9px] uppercase">{order.orderType.replace("_", " ")}</Badge>
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 border uppercase", c.bg, c.text, c.border)}>
            {order.paymentMethod}
          </span>
          {order.status && (
            <Badge variant="secondary" className="text-[9px]">{order.status}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {order.customerName}
          {order.customerPhone ? ` · ${order.customerPhone}` : ""}
          {order.createdAt ? ` · ${format(new Date(order.createdAt), "dd MMM, h:mm a")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-black text-sm text-rose-600">Rs.&nbsp;{order.totalAmount.toLocaleString()}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await markOrderPaid(order.id);
              if (res.success) {
                toast.success(`Order #${order.id} marked as paid`);
                onMarkPaid(order.id);
              } else {
                toast.error(res.error ?? "Failed to update");
              }
            })
          }
          className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Received
        </Button>
      </div>
    </div>
  );
}

// ─── All-clear pill ───────────────────────────────────────────────────────────
function AllClear({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RegisterClose({ data, dateLabel }: { data: RegisterCloseData; dateLabel?: string }) {
  const [creditOrders, setCreditOrders] = useState<UnpaidOrder[]>(data.unpaidCreditOrders);
  const [riderCash,    setRiderCash   ] = useState<RiderCashEntry[]>(data.riderCash);
  const [waiterCash,   setWaiterCash  ] = useState<WaiterCashEntry[]>(data.waiterCash);

  const handleMarkPaid        = (id: string)      => setCreditOrders(prev => prev.filter(o => o.id !== id));
  const handleRiderCollected  = (riderId: string) => setRiderCash(prev => prev.filter(r => r.riderId !== riderId));
  const handleWaiterCollected = (wId: string)     => setWaiterCash(prev => prev.filter(w => w.waiterId !== wId));

  const totalCredit      = creditOrders.reduce((s, o) => s + o.totalAmount, 0);
  const cashWithRiders   = riderCash.reduce((s, r) => s + r.totalCash, 0);
  const cashWithWaiters  = waiterCash.reduce((s, w) => s + w.totalCash, 0);
  const cashInRegister   = data.totalCashPaid - cashWithRiders - cashWithWaiters;
  const everythingClear  = cashWithRiders === 0 && cashWithWaiters === 0 && totalCredit === 0;

  return (
    <div className="space-y-5 print:space-y-3">

      {/* ── Top KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total paid sales */}
        <div className="border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Paid Sales</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight leading-none text-emerald-700 dark:text-emerald-400 tabular-nums">
            Rs.&nbsp;{data.totalPaidSales.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">All confirmed payments today</p>
        </div>

        {/* Cash in register */}
        <div className="border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cash in Register</span>
            <div className="p-1.5 bg-primary/10 text-primary">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight leading-none tabular-nums">
            Rs.&nbsp;{Math.max(0, cashInRegister).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Cash paid minus rider &amp; counter</p>
        </div>

        {/* Digital payments */}
        <div className="border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Digital Payments</span>
            <div className="p-1.5 bg-primary/10 text-primary">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight leading-none tabular-nums">
            Rs.&nbsp;{data.totalDigitalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">JazzCash · EasyPaisa · Card · Bank</p>
        </div>

        {/* Credit outstanding */}
        <div className={cn(
          "border p-4 flex flex-col gap-2",
          totalCredit > 0
            ? "border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/10"
            : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", totalCredit > 0 ? "text-rose-500" : "text-emerald-600")}>
              Credit / Unpaid
            </span>
            <div className={cn("p-1.5", totalCredit > 0 ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50")}>
              {totalCredit > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <p className={cn("text-3xl font-black tracking-tight leading-none tabular-nums", totalCredit > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
            Rs.&nbsp;{totalCredit.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {creditOrders.length === 0 ? "No outstanding credit" : `${creditOrders.length} order${creditOrders.length !== 1 ? "s" : ""} pending collection`}
          </p>
        </div>
      </div>

      {/* ── All clear banner ─────────────────────────────────────────────── */}
      {everythingClear && (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10 px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-black text-sm text-emerald-700 dark:text-emerald-400">Register is clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">All cash collected, no outstanding credit. You can close the register.</p>
          </div>
        </div>
      )}

      {/* ── Payment method breakdown ──────────────────────────────────────── */}
      <Section
        title="Payment Method Breakdown"
        subtitle="How today's sales came in — paid vs credit per method"
        icon={CreditCard}
        defaultOpen
        collapsible
      >
        {data.paymentMethodTotals.length === 0 ? (
          <AllClear label="No orders in this period." />
        ) : (
          <div className="divide-y divide-border/40">
            {[...data.paymentMethodTotals]
              .sort((a, b) => b.paid - a.paid)
              .map(m => <MethodRow key={m.method} {...m} />)}
          </div>
        )}
      </Section>

      {/* ── Cash with riders ─────────────────────────────────────────────── */}
      <Section
        title="Cash With Riders"
        subtitle={
          riderCash.length === 0
            ? "All rider cash collected — nothing outstanding"
            : `${riderCash.length} rider${riderCash.length !== 1 ? "s" : ""} still holding delivery cash`
        }
        amount={cashWithRiders}
        icon={Bike}
        variant={cashWithRiders > 0 ? "warning" : "success"}
        collapsible={riderCash.length > 0}
        defaultOpen={riderCash.length > 0}
        badge={
          riderCash.length > 0
            ? <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300 bg-amber-50">{riderCash.length} rider{riderCash.length !== 1 ? "s" : ""}</Badge>
            : undefined
        }
      >
        {riderCash.length === 0 ? (
          <AllClear label="All rider cash accounted for. Nothing outstanding." />
        ) : (
          riderCash.map(entry => (
            <RiderCard key={entry.riderId} entry={entry} onCollected={handleRiderCollected} />
          ))
        )}
      </Section>

      {/* ── Cash with waiters ────────────────────────────────────────────── */}
      <Section
        title="Cash With Waiters / Counter"
        subtitle={
          waiterCash.length === 0
            ? "All counter cash reconciled — nothing outstanding"
            : `${waiterCash.length} staff member${waiterCash.length !== 1 ? "s" : ""} with unreturned counter cash`
        }
        amount={cashWithWaiters}
        icon={Users}
        variant={cashWithWaiters > 0 ? "warning" : "success"}
        collapsible={waiterCash.length > 0}
        defaultOpen={waiterCash.length > 0}
        badge={
          waiterCash.length > 0
            ? <Badge variant="outline" className="text-[9px] text-blue-700 border-blue-300 bg-blue-50">{waiterCash.length} staff</Badge>
            : undefined
        }
      >
        {waiterCash.length === 0 ? (
          <AllClear label="All counter cash reconciled." />
        ) : (
          waiterCash.map(entry => (
            <WaiterCard key={entry.waiterId} entry={entry} onCollected={handleWaiterCollected} />
          ))
        )}
      </Section>

      {/* ── Credit orders ────────────────────────────────────────────────── */}
      <Section
        title="Credit Orders — Will Pay Later"
        subtitle={
          creditOrders.length === 0
            ? "No outstanding credit — all customers have paid"
            : `${creditOrders.length} order${creditOrders.length !== 1 ? "s" : ""} not yet collected — mark as received when cash arrives`
        }
        amount={totalCredit}
        icon={Clock}
        variant={totalCredit > 0 ? "danger" : "success"}
        collapsible={creditOrders.length > 0}
        defaultOpen={creditOrders.length > 0}
        badge={
          creditOrders.length > 0
            ? <Badge variant="outline" className="text-[9px] text-rose-700 border-rose-300 bg-rose-50">{creditOrders.length} pending</Badge>
            : undefined
        }
      >
        {creditOrders.length === 0 ? (
          <AllClear label="No credit orders. All payments collected." />
        ) : (
          creditOrders.map(o => (
            <CreditRow key={o.id} order={o} onMarkPaid={handleMarkPaid} />
          ))
        )}
      </Section>

      {/* ── Register reconciliation panel ────────────────────────────────── */}
      <div className="border border-primary/25 bg-primary/5 dark:bg-primary/[0.07] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/15">
          <div className="p-2 bg-primary/15 text-primary">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest">Register Reconciliation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Where all the money is right now</p>
          </div>
        </div>

        {/* Math rows */}
        <div className="py-1">
          <RecRow label="Total cash payments received today"          amount={data.totalCashPaid}   sign="+" />
          <RecRow label="Cash with riders (not yet collected)"        amount={cashWithRiders}        sign="-" muted={cashWithRiders === 0} />
          <RecRow label="Cash with waiters / counter (not returned)"  amount={cashWithWaiters}       sign="-" muted={cashWithWaiters === 0} />
          <Separator className="my-1 bg-primary/15" />
          <RecRow label="Cash that should be in the register"         amount={Math.max(0, cashInRegister)} sign="=" />
        </div>

        {/* Footer: digital + credit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-t border-primary/15">
          <div className="px-5 py-3.5 sm:border-r border-primary/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Digital (in bank/wallet)</p>
            <p className="font-black text-base">Rs.&nbsp;{data.totalDigitalPaid.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">JazzCash · EasyPaisa · Card · Bank</p>
          </div>
          <div className={cn("px-5 py-3.5 sm:border-r border-primary/10", totalCredit > 0 && "bg-rose-50/40 dark:bg-rose-950/10")}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Credit still outstanding</p>
            <p className={cn("font-black text-base", totalCredit > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
              Rs.&nbsp;{totalCredit.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{creditOrders.length} order{creditOrders.length !== 1 ? "s" : ""} uncollected</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total accounted for</p>
            <p className="font-black text-base text-primary">
              Rs.&nbsp;{(Math.max(0, cashInRegister) + data.totalDigitalPaid).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cash in drawer + digital received</p>
          </div>
        </div>
      </div>

      {/* ── Print-only: summary ───────────────────────────────────────────── */}
      <div className="hidden print:block border-t pt-4 mt-4 text-xs text-gray-500">
        <p className="font-bold">Register Close Report · {dateLabel}</p>
        <p className="mt-1">Generated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Reconciliation row helper ────────────────────────────────────────────────
function RecRow({
  label,
  amount,
  sign,
  muted = false,
}: {
  label: string;
  amount: number;
  sign: "+" | "-" | "=";
  muted?: boolean;
}) {
  const color = { "+": "text-emerald-700 dark:text-emerald-400", "-": "text-rose-600 dark:text-rose-400", "=": "text-primary" };
  return (
    <div className={cn("flex justify-between items-center px-5 py-2.5", muted && "opacity-50")}>
      <div className="flex items-center gap-2 text-sm">
        <span className={cn("w-4 text-center font-black text-base", color[sign])}>{sign}</span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className={cn("font-black tabular-nums", sign === "=" ? "text-xl text-primary" : `text-base ${color[sign]}`)}>
        Rs.&nbsp;{amount.toLocaleString()}
      </span>
    </div>
  );
}
