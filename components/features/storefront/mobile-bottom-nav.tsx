// components/features/storefront/mobile-bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, UtensilsCrossed, MapPin, ShoppingBag, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import { useCartStore } from "@/lib/store/cart-store";
import { useState, useEffect, useTransition } from "react";
import { CheckoutDrawer } from "./checkout-drawer";
import { FloatingCart } from "./floating-cart";

export function MobileBottomNav({ isOpen = true }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleNavClick = (href: string) => {
    if (pathname === href) return;
    setNavigatingTo(href);
    startTransition(() => {
      router.push(href);
    });
  };

  // Left side items
  const leftItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Menu", href: "/menu", icon: UtensilsCrossed },
  ];

  // Right side items
  const rightItems = [
    { label: "Track", href: "/track", icon: MapPin },
  ];

  if (pathname.includes("/product/") || pathname.includes("/checkout")) {
    return <CheckoutDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />;
  }

  const isDealsActive = pathname === "/deals" || pathname.startsWith("/deals/");
  const isDealsLoading = navigatingTo === "/deals";

  return (
    <>
      <FloatingCart onOpen={() => setIsCartOpen(true)} disabled={!isOpen} />

      {/* Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] font-sans">
        <div className="flex items-end justify-around h-[68px] px-1">

          {/* Left items */}
          {leftItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            const isLoading = navigatingTo === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-[68px] space-y-1 transition-colors min-h-[48px] disabled:opacity-70",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <item.icon className={cn("w-6 h-6", isActive && "fill-primary/10")} strokeWidth={isActive ? 2.5 : 2} />
                )}
                <span className={cn("text-[10px] font-semibold tracking-wide uppercase", isLoading && "text-primary")}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Center Deals FAB */}
          <div className="flex flex-col items-center justify-end w-20 shrink-0 pb-2">
            <button
              onClick={() => handleNavClick("/deals")}
              disabled={isDealsLoading}
              className={cn(
                "relative -top-5 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all active:scale-95",
                isDealsActive
                  ? "bg-primary text-primary-foreground shadow-primary/40"
                  : "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/50"
              )}
            >
              {isDealsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Tag className="w-6 h-6" strokeWidth={isDealsActive ? 2.5 : 2} />
              )}
            </button>
            <span className={cn(
              "text-[10px] font-semibold tracking-wide uppercase -mt-3",
              isDealsActive || isDealsLoading ? "text-primary" : "text-muted-foreground"
            )}>
              Deals
            </span>
          </div>

          {/* Right items */}
          {rightItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            const isLoading = navigatingTo === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-[68px] space-y-1 transition-colors min-h-[48px] disabled:opacity-70",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <item.icon className={cn("w-6 h-6", isActive && "fill-primary/10")} strokeWidth={isActive ? 2.5 : 2} />
                )}
                <span className={cn("text-[10px] font-semibold tracking-wide uppercase", isLoading && "text-primary")}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Cart */}
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
