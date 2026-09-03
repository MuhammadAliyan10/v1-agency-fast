"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProductDetailDrawer } from "./product-detail-drawer";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";
import { Star, Flame, ShoppingBag, ChevronRight } from "lucide-react";

interface SpecialItemSectionProps {
  categories: { id: string; name: string; items: any[] }[];
}

export function SpecialItemSection({ categories }: SpecialItemSectionProps) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const allItems = categories.flatMap((c) => c.items || []).filter((i) => i.isAvailable !== false);

  // Check top-level isFeatured flag OR tags
  const specialItem =
    allItems.find((i) => i.isFeatured) ||
    allItems.find((i) => i.tags?.isFeatured) ||
    allItems.find((i) => i.tags?.isPopular) ||
    allItems[0];

  if (!specialItem) return null;

  const handleAdd = () => {
    if (specialItem.variants?.length || specialItem.addOns?.length) {
      setSelectedItem(specialItem);
      return;
    }
    addItem({
      id: specialItem.id,
      name: specialItem.name,
      price: specialItem.basePrice || specialItem.price,
      quantity: 1,
      options: { imageUrl: specialItem.imageUrl },
    });
    toast.success(`${specialItem.name} added to cart!`);
  };

  const price = specialItem.basePrice || specialItem.price || 0;

  return (
    <>
      <section className="w-full border-b border-zinc-200">
        {/* Full-width container with rich dark gradient and image background */}
        <div className="relative w-full min-h-[520px] md:min-h-[600px] flex flex-col justify-between overflow-hidden bg-zinc-950">
          
          {/* Background image */}
          {specialItem.imageUrl && (
            <img
              src={specialItem.imageUrl}
              alt={specialItem.name}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transition-transform duration-[10000ms] hover:scale-100"
            />
          )}

          {/* Vignette & gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />

          {/* Top header link row */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-primary">
              <Star className="w-3 h-3 fill-current" /> Chef&apos;s Special
            </span>
            <Link
              href="/menu"
              className="inline-flex items-center text-[11px] font-medium uppercase tracking-wider text-zinc-400 hover:text-white transition-colors gap-1"
            >
              Full Menu <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Centered Typography & Details Content */}
          <div className="relative z-10 w-full max-w-3xl mx-auto px-6 py-12 text-center space-y-6">
            
            {/* Badges */}
            <div className="flex items-center justify-center gap-2">
              {(specialItem.isFeatured || specialItem.tags?.isFeatured) && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  Featured
                </span>
              )}
              {specialItem.tags?.isSpicy && (
                <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Spicy
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-none text-balance">
              {specialItem.name}
            </h2>

            {/* Description */}
            {specialItem.description && (
              <p className="text-xs sm:text-sm md:text-base text-zinc-300 max-w-lg mx-auto leading-relaxed font-sans font-medium">
                {specialItem.description}
              </p>
            )}

            {/* Variants pills */}
            {specialItem.variants?.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {specialItem.variants.map((v: any) => (
                  <span
                    key={v.id}
                    className="text-[11px] border border-white/20 bg-white/10 text-white/90 px-3 py-1 font-mono"
                  >
                    {v.name} — Rs. {v.price}
                  </span>
                ))}
              </div>
            )}

            {/* Price & Order Now Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-center sm:text-left">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  Starting from
                </span>
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  Rs. {price.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleAdd}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm uppercase tracking-widest transition-transform active:scale-95 flex items-center gap-2 shadow-lg rounded-none"
              >
                <ShoppingBag className="w-4 h-4" />
                Order Now
              </button>
            </div>

          </div>

          {/* Bottom spacing */}
          <div className="h-6" />

        </div>
      </section>

      <ProductDetailDrawer
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
