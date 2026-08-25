"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="py-8 w-full">
      <div className="rounded-3xl overflow-hidden relative min-h-[350px] md:min-h-[450px] flex items-center shadow-2xl group">
        <Image
          src="https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&h=800&fit=crop&q=80"
          alt="Promotional Banner"
          fill
          priority
          className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-background/20 backdrop-blur-md border border-white/10 p-8 md:p-12 rounded-3xl max-w-lg md:max-w-xl mx-0 sm:mx-6 md:mx-0 shadow-2xl">
            <span className="text-primary uppercase tracking-widest text-xs md:text-sm font-black mb-3 block drop-shadow-md">
              Limited Time Offer
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 drop-shadow-lg">
              The Midnight Feast
            </h2>
            <p className="text-base md:text-lg text-zinc-200 mb-8 drop-shadow-md font-medium">
              2 Zinger Burgers, 1 Large Pizza, and 1 Liter Drink for just Rs. 1499. Perfect for sharing with friends and family.
            </p>
            
            <Button size="lg" className="rounded-full font-bold shadow-xl active:scale-95 transition-all text-sm md:text-base px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="/?category=deals">
                Order Deal Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
