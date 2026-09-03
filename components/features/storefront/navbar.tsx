"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ShoppingBag, 
  User, 
  Receipt,
  Sun,
  Moon,
  Laptop,
  Menu,
  MapPin,
  Search
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppDrawer } from "@/components/ui/app-drawer";
import { useCart } from "@/store/use-cart";
import { useCartStore } from "@/lib/store/cart-store";
import { CheckoutDrawer } from "./checkout-drawer";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (!container) return;
    
    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 20);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 left-0 right-0 z-50 font-sans transition-all duration-300",
      isScrolled ? "bg-background/80 backdrop-blur-md border-b border-border" : "bg-transparent border-transparent"
    )}>
      <nav className="mx-auto max-w-screen-2xl px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Left: Mobile Menu Toggle / Desktop Links */}
          <div className="flex items-center gap-10">
            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <Button onClick={() => setIsMobileMenuOpen(true)} variant="ghost" size="icon" className="hover:bg-zinc-100 text-zinc-950 -ml-2 min-h-[48px] min-w-[48px]" aria-label="Open menu">
                <Menu className="w-6 h-6 transition-colors duration-300" />
              </Button>
              
              <AppDrawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <div className="flex flex-col h-full bg-background pb-8">
                  <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
                    <Image src="/logo.png" alt="Classy Crave" width={32} height={32} className="rounded-none object-contain" />
                    <h2 className="font-serif text-2xl tracking-tighter text-left font-bold">
                      Classy Crave
                    </h2>
                  </div>
                  <nav className="mt-4 flex flex-col px-4 space-y-2">
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "text-sm uppercase tracking-widest transition-colors min-h-[48px] flex items-center px-4 rounded-none",
                        pathname === "/" ? "bg-primary/5 text-primary font-bold border-l-2 border-primary" : "text-muted-foreground hover:bg-muted font-semibold border-l-2 border-transparent"
                      )}
                    >
                      Home
                    </Link>
                    {[
                      { href: "/menu", label: "Menu" },
                      { href: "/deals", label: "Deals" },
                      { href: "/track", label: "Track" },
                      { href: "/about", label: "About" },
                      { href: "/contact", label: "Contact" }
                    ].map((link) => {
                      const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "text-sm uppercase tracking-widest transition-colors min-h-[48px] flex items-center px-4 rounded-none",
                            isActive ? "bg-primary/5 text-primary font-bold border-l-2 border-primary" : "text-muted-foreground hover:bg-muted font-semibold border-l-2 border-transparent"
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                    <div className="h-px bg-border my-2 w-full" />
                    <Link
                      href="#"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm uppercase tracking-widest text-muted-foreground hover:bg-muted font-semibold flex items-center gap-2 min-h-[48px] px-4 rounded-none border-l-2 border-transparent"
                    >
                      <User className="h-5 w-5" />
                      Login
                    </Link>
                  </nav>
                </div>
              </AppDrawer>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "/menu", label: "Menu" },
                { href: "/deals", label: "Deals" },
                { href: "/track", label: "Track" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" }
              ].map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative text-[12px] uppercase tracking-widest transition-colors duration-300",
                      isActive
                        ? "text-zinc-950 font-medium"
                        : "text-zinc-500 hover:text-zinc-950"
                    )}
                  >
                    {link.label}
                    {/* Active underline */}
                    <span
                      className={cn(
                        "absolute -bottom-1 left-0 h-[1px] bg-current transition-transform duration-300 origin-left",
                        isActive ? "w-full scale-x-100" : "w-full scale-x-0"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Center: Brand */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 min-h-[48px]">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Classy Crave" width={32} height={32} className="rounded-none object-contain" />
              <span className="font-serif text-xl md:text-2xl tracking-wider transition-colors duration-300 text-zinc-950">
                Classy Crave
              </span>
            </Link>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative p-2 transition-colors duration-300 text-zinc-950 hover:bg-zinc-100 min-h-[48px] min-w-[48px] hidden md:inline-flex"
            >
              <User className="h-6 w-6" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative p-2 transition-colors duration-300 text-zinc-950 hover:bg-zinc-100 min-h-[48px] min-w-[48px]"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="h-6 w-6" />
              {mounted && totalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-none">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>
      <CheckoutDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
}
