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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/store/use-cart";
import { CartSheet } from "./cart-sheet";
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
  
  const getTotalItems = useCart((state) => state.getTotalItems);
  const { setTheme } = useTheme();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalItems = getTotalItems();

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200 font-sans">
      <nav className="mx-auto max-w-screen-2xl px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Left: Mobile Menu Toggle / Desktop Links */}
          <div className="flex items-center gap-10">
            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-zinc-100 text-zinc-950 -ml-2" aria-label="Open menu">
                    <Menu className="w-5 h-5 transition-colors duration-300" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] border-zinc-200">
                  <SheetHeader className="px-4">
                    <SheetTitle className="font-serif text-2xl tracking-tighter text-left">
                      Classy Crave
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-4 px-4">
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "text-sm uppercase tracking-widest transition-colors",
                        pathname === "/" ? "text-zinc-950 font-bold" : "text-zinc-600 hover:text-zinc-950 font-semibold"
                      )}
                    >
                      Home
                    </Link>
                    {[
                      { href: "/menu", label: "Menu" },
                      { href: "/deals", label: "Deals 🔥" },
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
                            "text-sm uppercase tracking-widest transition-colors",
                            isActive ? "text-zinc-950 font-bold" : "text-zinc-600 hover:text-zinc-950 font-semibold"
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                    <div className="h-px bg-zinc-100 my-2 w-full" />
                    <Link
                      href="#"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm uppercase tracking-widest text-zinc-600 hover:text-zinc-950 font-semibold flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Login
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "/menu", label: "Menu" },
                { href: "/deals", label: "Deals 🔥" },
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
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="block">
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
              className="relative p-2 transition-colors duration-300 text-zinc-950 hover:bg-zinc-100 h-auto w-auto hidden md:inline-flex"
            >
              <User className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative p-2 transition-colors duration-300 text-zinc-950 hover:bg-zinc-100 h-auto w-auto"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
}
