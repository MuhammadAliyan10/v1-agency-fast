"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { useState, useEffect } from "react";
import { CartSheet } from "./cart-sheet";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const getTotalItems = useCart((state) => state.getTotalItems);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = getTotalItems();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Menu", href: "/menu", icon: UtensilsCrossed },
    { label: "Track", href: "/track", icon: MapPin },
  ];

  if (pathname.includes("/product/") || pathname.includes("/checkout")) {
    return <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />;
  }

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] font-sans">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "fill-primary/10")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-semibold tracking-wide uppercase">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-zinc-900 transition-colors relative"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={2} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-wide uppercase">Cart</span>
          </button>
        </div>
      </div>
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
