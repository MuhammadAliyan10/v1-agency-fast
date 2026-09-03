"use client";

import React from "react";
import Image from "next/image";
import { ShoppingBag, Utensils, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItemCardProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    basePrice?: number;
    price?: number;
    imageUrl: string | null;
    variants?: any[];
    isFeatured?: boolean;
    tags?: { isSpicy?: boolean; isPopular?: boolean; isFeatured?: boolean };
    isAvailable?: boolean;
  };
  onAdd: (item: any) => void;
  onCustomize: (item: any) => void;
  priority?: boolean;
}

export const MenuItemCard = React.memo(function MenuItemCard({ item, onAdd, onCustomize, priority = false }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;
  const isAvailable = item.isAvailable !== false;
  const price = item.basePrice || item.price || 0;
  const isFeaturedItem = item.isFeatured || item.tags?.isFeatured;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (hasVariants) {
      onCustomize(item);
    } else {
      onAdd(item);
    }
  };

  return (
    <div
      onClick={() => isAvailable && onCustomize(item)}
      className={cn(
        "relative flex flex-col bg-white border border-zinc-200 shadow-sm overflow-hidden cursor-pointer group transition-shadow hover:shadow-md rounded-none",
        !isAvailable && "opacity-60 grayscale-[0.4] pointer-events-none"
      )}
    >
      {/* Image */}
      <div className="relative w-full h-48 bg-zinc-100 overflow-hidden shrink-0">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-100">
            <Utensils className="w-10 h-10 text-zinc-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {isFeaturedItem && (
            <span className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-current" /> Featured
            </span>
          )}
          {item.tags?.isPopular && !isFeaturedItem && (
            <span className="bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-current" /> Popular
            </span>
          )}
          {item.tags?.isSpicy && (
            <span className="bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" /> Spicy
            </span>
          )}
        </div>

        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-sm md:text-base leading-tight text-zinc-950 line-clamp-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-100">
          <div>
            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
              {hasVariants ? "From" : "Price"}
            </p>
            <p className="font-black text-base text-zinc-950">
              Rs. {price.toLocaleString()}
            </p>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isAvailable}
            className={cn(
              "h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground shadow-sm active:scale-95 transition-transform shrink-0",
              !isAvailable && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
