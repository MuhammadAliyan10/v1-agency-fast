"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingCart({ onOpen, disabled }: { onOpen: () => void; disabled?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const { getTotals } = useCartStore();
  const { itemCount, totalPrice } = getTotals();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || itemCount === 0) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] left-0 right-0 px-4 z-40">
      <button 
        onClick={onOpen}
        disabled={disabled}
        className={cn(
          "w-full h-14 flex items-center justify-between px-4 shadow-lg active:scale-[0.98] transition-transform",
          disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="bg-black/20 h-8 w-8 flex items-center justify-center font-bold text-sm">
            {itemCount}
          </div>
          <span className="font-semibold text-sm">View Cart</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">Rs. {totalPrice}</span>
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>
    </div>
  );
}
