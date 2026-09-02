"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { useState, useEffect } from "react";
import { CheckoutDrawer } from "./checkout-drawer";
import { FloatingCart } from "./floating-cart";

export function MobileBottomNav({ isOpen = true }: { isOpen?: boolean }) {
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
    return <CheckoutDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />;
  }

  return (
    <>
      <FloatingCart onOpen={() => setIsCartOpen(true)} disabled={!isOpen} />
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.03)] font-sans">
        <div className="flex items-center justify-around h-[68px] px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-[68px] space-y-1 transition-colors min-h-[48px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive && "fill-primary/10")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-semibold tracking-wide uppercase mt-1">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center w-full h-[68px] space-y-1 text-muted-foreground hover:text-foreground transition-colors relative min-h-[48px]"
          >
            <div className="relative mt-1">
              <ShoppingBag className="w-6 h-6" strokeWidth={2} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-2 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-none">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-wide uppercase mt-1">Cart</span>
          </button>
        </div>
      </div>
      <CheckoutDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
