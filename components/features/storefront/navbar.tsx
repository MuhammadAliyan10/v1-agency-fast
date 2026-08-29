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
  Menu
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const navLinks = [
  { name: "Home", href: "/" },
  { name: "The Menu", href: "/menu" },
  { name: "Track Order", href: "/track" },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
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
    <header className={cn(
      "fixed top-0 z-50 w-full transition-all duration-500 ease-out border-b",
      isScrolled 
        ? "bg-background/80 backdrop-blur-2xl border-border/50 shadow-sm py-3" 
        : "bg-background border-transparent py-4 md:py-5"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 lg:px-12">
        
        {/* Left: Mobile Menu Toggle */}
        <div className="md:hidden flex-1">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50 text-muted-foreground -ml-2">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Brand */}
        <Link 
          href="/" 
          className="flex-shrink-0 flex items-center justify-center transition-opacity hover:opacity-90"
        >
          <Image 
            src="/Logo.png" 
            alt="Classy Crave Logo" 
            width={120} 
            height={40} 
            className="h-10 w-auto rounded object-contain"
            priority
          />
        </Link>
        
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name}
                href={link.href} 
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Right Actions */}
        <div className="flex-1 flex justify-end items-center space-x-1 md:space-x-2 -mr-2 md:-mr-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-muted/50 transition-colors rounded-full text-foreground"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
            {mounted && totalItems > 0 && (
              <Badge 
                className="absolute -right-1 -top-1 flex h-4 w-4 md:h-4 md:w-4 items-center justify-center rounded-full bg-primary p-0 text-[10px] text-primary-foreground font-black border-2 border-background"
              >
                {totalItems}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50 text-foreground">
                <User className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-border/50 p-2">
              <DropdownMenuLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-2 py-3">Account</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl focus:bg-muted py-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">My Orders</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl focus:bg-muted py-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2 bg-border/50" />
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 cursor-pointer rounded-xl focus:bg-muted py-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="rounded-2xl p-2 shadow-xl border-border/50">
                    <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2 rounded-xl focus:bg-muted py-2">
                      <Sun className="h-4 w-4 text-muted-foreground" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2 rounded-xl focus:bg-muted py-2">
                      <Moon className="h-4 w-4 text-muted-foreground" /> Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2 rounded-xl focus:bg-muted py-2">
                      <Laptop className="h-4 w-4 text-muted-foreground" /> System
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator className="my-2 bg-border/50" />
              <DropdownMenuItem className="cursor-pointer font-bold text-sm text-primary focus:text-primary focus:bg-primary/10 rounded-xl py-2">
                Sign In / Register
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
}
