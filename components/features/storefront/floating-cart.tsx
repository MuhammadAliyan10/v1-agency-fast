"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingCart({ onOpen, disabled }: { onOpen: () => void; disabled?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const { getTotals } = useCartStore();
  const { itemCount } = getTotals();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || itemCount === 0) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-4 z-40">
      <button 
        onClick={onOpen}
        disabled={disabled}
        aria-label="View Cart"
        className={cn(
          "relative w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all duration-200 border-2 border-white/30",
          disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/95"
        )}
      >
        <ShoppingBag className="w-6 h-6" strokeWidth={2.2} />
        
        {/* Item Count Badge */}
        <span className="absolute -top-1 -right-1 bg-zinc-950 text-white font-black text-[11px] min-w-[22px] h-[22px] px-1 rounded-full border-2 border-white flex items-center justify-center shadow-md animate-in zoom-in-50">
          {itemCount}
        </span>
      </button>
    </div>
  );
}
