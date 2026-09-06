"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Clock, ChevronRight, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "cc_recent_orders";

// Support both legacy {id, placedAt} and new {id, token, placedAt}
type RecentOrder = { id: string; token: string; placedAt: number };

function useRecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown[] = JSON.parse(raw);

      const normalised: RecentOrder[] = parsed
        .map((entry): RecentOrder | null => {
          if (typeof entry === "string") {
            return { id: entry, token: entry, placedAt: Date.now() };
          }
          if (entry && typeof entry === "object") {
            const e = entry as Record<string, unknown>;
            if (typeof e.id === "string") {
              return {
                id: e.id,
                token: typeof e.token === "string" ? e.token : e.id,
                placedAt: typeof e.placedAt === "number" ? e.placedAt : Date.now(),
              };
            }
          }
          return null;
        })
        .filter((e): e is RecentOrder => e !== null);

      // Auto-expire after 7 days
      const fresh = normalised.filter(
        (o) => Date.now() - o.placedAt < 7 * 24 * 60 * 60 * 1000
      );
      if (fresh.length !== normalised.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      }
      setOrders(fresh);
    } catch {
      setOrders([]);
    }
  }, []);

  const remove = (id: string) => {
    try {
      const updated = orders.filter((o) => o.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setOrders(updated);
    } catch {}
  };

  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setOrders([]);
    } catch {}
  };

  return { orders, remove, clear, mounted };
}

export default function TrackSearchPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { orders: recentOrders, remove, clear, mounted } = useRecentOrders();

  const navigate = (token: string) => {
    const clean = token.replace(/^#/, "").trim();
    if (!clean) return;
    setIsSearching(true);
    router.push(`/track/${encodeURIComponent(clean)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(input.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-24">
      <div className="max-w-sm mx-auto pt-12 px-4 space-y-8">

        {/* Title */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Track Your Order
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Enter your tracking token or Order ID to view live status.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="e.g. CC-1234AB or tracking token..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-10 h-11 text-sm bg-white border-zinc-300 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isSearching}
            className="h-11 text-sm font-semibold w-full rounded-none"
          >
            {isSearching
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Searching...</>
              : "Track Order"}
          </Button>
        </form>

        <p className="text-[11px] text-zinc-400 text-center -mt-4">
          Your tracking token is in your WhatsApp or SMS confirmation.
        </p>

        {/* Recent orders — only render after mount to avoid SSR mismatch */}
        {mounted && recentOrders.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                My Recent Orders
              </div>
              <button
                type="button"
                onClick={clear}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 font-medium transition-colors underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="group relative flex items-center justify-between bg-zinc-50 border border-zinc-200 px-4 py-3.5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer active:scale-[0.99]"
                  onClick={() => navigate(order.token)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(order.token)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-white border border-zinc-200 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                      <Package className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm text-zinc-900 leading-none tracking-wide">
                        {order.id}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {formatDistanceToNow(new Date(order.placedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-primary hidden group-hover:block">
                      Track
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(order.id);
                      }}
                      className="p-1 text-zinc-300 hover:text-rose-500 transition-colors ml-1"
                      aria-label={`Remove order ${order.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-400 text-center">
              Removed automatically when your order is delivered.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
