"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, ClipboardCheck, Bike, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const steps = [
  {
    step: "01",
    icon: ShoppingBag,
    title: "Menu Browse Karein",
    titleEn: "Browse the Menu",
    desc: "Apni pasand ka khana choose karein — burgers, pizzas, deals aur bohat kuch.",
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  {
    step: "02",
    icon: ClipboardCheck,
    title: "Order Place Karein",
    titleEn: "Place Your Order",
    desc: "Apna naam, phone aur address dalein. Cash on Delivery available hai — koi advance payment nahi.",
    color: "bg-green-500/10 text-green-600",
    border: "border-green-200",
  },
  {
    step: "03",
    icon: Bike,
    title: "Ghar Baithe Receive Karein",
    titleEn: "Receive at Your Door",
    desc: "Hamara rider thodi dair mein aapke ghar pahunch jaata hai. Order track karna bhi itna aasaan hai.",
    color: "bg-orange-500/10 text-orange-600",
    border: "border-orange-200",
  },
  {
    step: "04",
    icon: Star,
    title: "Enjoy Aur Review Dein",
    titleEn: "Enjoy & Review",
    desc: "Khana khao, khush raho! Apna feedback zaroor dein taake hum mazeed behtar ho sakein.",
    color: "bg-yellow-400/10 text-yellow-600",
    border: "border-yellow-200",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HowItWorks() {
  return (
    <section className="w-full border-t border-border bg-zinc-50 py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/8 px-3 py-1 mb-3">
            Simple Hai
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-zinc-950 mb-2">
            Order Karna Bilkul Aasaan Hai
          </h2>
          <p className="text-sm text-zinc-500 font-medium max-w-md mx-auto">
            Sirf 4 steps mein ghar baithe apna favourite khana mangwaein — koi confusion nahi.
          </p>
        </div>

        {/* Steps grid — 2×2 on mobile, 4 across on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          {steps.map((s, index) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className={cn(
                  "relative bg-white border rounded-none p-4 md:p-5 flex flex-col gap-3",
                  s.border
                )}
              >
                {/* Step number — top right */}
                <span className="absolute top-3 right-3 text-[10px] font-black text-zinc-300 font-mono">
                  {s.step}
                </span>

                {/* Icon circle */}
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-none shrink-0",
                    s.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Text */}
                <div>
                  <p className="font-black text-sm text-zinc-950 leading-tight mb-1">
                    {s.title}
                  </p>
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
                    {s.titleEn}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Connector arrow — hidden on last item, only on desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-zinc-300 text-lg font-bold select-none">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* COD trust badge — critical for Pakistani mobile-first users */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 bg-white border border-green-200 p-4 md:p-5">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-8 h-8 bg-green-100 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-black text-sm">Cash on Delivery Available</p>
              <p className="text-xs text-green-600 font-medium">
                Koi advance payment nahi — rider ko cash dijiye
              </p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-green-200" />
          <div className="flex items-center gap-2 text-zinc-700">
            <div className="w-8 h-8 bg-zinc-100 flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <p className="font-black text-sm">Live Order Tracking</p>
              <p className="text-xs text-zinc-500 font-medium">
                Apna order real-time mein track karein
              </p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-zinc-200" />
          <Link
            href="/menu"
            className="shrink-0 h-10 px-6 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform rounded-none"
          >
            Order Now
          </Link>
        </div>

      </div>
    </section>
  );
}
