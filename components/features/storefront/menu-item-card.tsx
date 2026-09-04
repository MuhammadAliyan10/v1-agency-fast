"use client";

import React from "react";
import Image from "next/image";
import { Plus, Utensils, Flame, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItemCardProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    basePrice?: number;
    price?: number;
    imageUrl: string | null;
    variants?: { id: string; name: string; price: number }[];
    isFeatured?: boolean;
    tags?: { isSpicy?: boolean; isPopular?: boolean; isFeatured?: boolean };
    isAvailable?: boolean;
  };
  onAdd: (item: MenuItemCardProps["item"]) => void;
  onCustomize: (item: MenuItemCardProps["item"]) => void;
  priority?: boolean;
}

export const MenuItemCard = React.memo(function MenuItemCard({
  item,
  onAdd,
  onCustomize,
  priority = false,
}: MenuItemCardProps) {
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const isAvailable = item.isAvailable !== false;
  const price = Number(item.basePrice ?? item.price) || 0;
  const isFeaturedItem = item.isFeatured ?? item.tags?.isFeatured;

  const handleAddButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    hasVariants ? onCustomize(item) : onAdd(item);
  };

  return (
    <div
      onClick={() => isAvailable && onCustomize(item)}
      onKeyDown={(e) => e.key === "Enter" && isAvailable && onCustomize(item)}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-label={`${item.name}, Rs. ${price.toLocaleString()}`}
      className={cn(
        // Base
        "relative flex flex-col bg-white border border-zinc-200/80 overflow-hidden rounded-none",
        // Shadow + hover
        "shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.11)]",
        // Tap feedback — feels native on mobile
        "cursor-pointer active:scale-[0.97] transition-[transform,box-shadow] duration-150",
        !isAvailable && "opacity-55 pointer-events-none grayscale-[0.3]"
      )}
    >
      {/* ── Image — 4:3 ratio ──────────────────────────────────────────
          On a 50vw column (~185 px on iPhone 14) this gives ~139 px of
          image height — enough to read the food but not overwhelming.   */}
      <div className="relative w-full aspect-[4/3] bg-zinc-100 overflow-hidden shrink-0">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            // Serve ~200 px wide image on mobile, larger on desktop
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-50">
            <Utensils className="w-7 h-7 text-zinc-300" />
          </div>
        )}

        {/* Badges — stacked top-left, tiny so they don't cover the food */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 z-10">
          {isFeaturedItem && (
            <span className="bg-primary text-primary-foreground text-[7px] font-black uppercase tracking-wide px-1.5 py-0.5 leading-none flex items-center gap-0.5">
              <Star className="w-1.5 h-1.5 fill-current" />
              Hot
            </span>
          )}
          {item.tags?.isPopular && !isFeaturedItem && (
            <span className="bg-amber-500 text-white text-[7px] font-black uppercase tracking-wide px-1.5 py-0.5 leading-none">
              Popular
            </span>
          )}
          {item.tags?.isSpicy && (
            <span className="bg-red-500 text-white text-[7px] font-black uppercase tracking-wide px-1.5 py-0.5 leading-none flex items-center gap-0.5">
              <Flame className="w-1.5 h-1.5" />
              Spicy
            </span>
          )}
        </div>

        {/* "Sizes" chip — bottom-right, tells user there are variants */}
        {hasVariants && isAvailable && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/55 backdrop-blur-sm text-white text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 flex items-center gap-0.5">
            Sizes <ChevronDown className="w-2 h-2" />
          </div>
        )}

        {/* Sold-out overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[9px] font-black uppercase tracking-widest bg-black/65 px-2 py-0.5">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* ── Text body ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-2 pt-2 pb-2.5 gap-1">

        {/* Item name — max 2 lines, tight leading for compact cards */}
        <h3 className="font-bold text-[12.5px] leading-[1.25] text-zinc-950 line-clamp-2">
          {item.name}
        </h3>

        {/* Description — 1 line only, very subtle, skipped if empty */}
        {item.description && (
          <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">
            {item.description}
          </p>
        )}

        {/* Price + Add button — always at the bottom */}
        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-zinc-100/80">
          {/* Price */}
          <div className="leading-none">
            <span className="text-[8.5px] text-zinc-400 font-medium uppercase tracking-wide block mb-0.5">
              {hasVariants ? "From" : ""}
            </span>
            <span className="font-black text-[13px] text-zinc-950 tracking-tight">
              Rs.&nbsp;{price.toLocaleString()}
            </span>
          </div>

          {/* Add / Customize CTA — 32×32 tap target */}
          <button
            type="button"
            onClick={handleAddButton}
            disabled={!isAvailable}
            aria-label={
              hasVariants ? `Customize ${item.name}` : `Add ${item.name} to cart`
            }
            className={cn(
              "shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground",
              "active:scale-[0.85] transition-transform duration-100",
              !isAvailable && "opacity-30 cursor-not-allowed"
            )}
          >
            <Plus className="w-[15px] h-[15px] stroke-[2.8]" />
          </button>
        </div>
      </div>
    </div>
  );
});
