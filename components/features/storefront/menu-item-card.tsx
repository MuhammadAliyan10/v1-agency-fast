"use client";

import React from "react";
import Image from "next/image";
import { Plus, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MenuItemCardProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    basePrice?: number;
    price?: number;
    imageUrl: string | null;
    variants?: any[];
    tags?: { isSpicy?: boolean; isPopular?: boolean };
    isAvailable?: boolean;
  };
  onAdd: (item: any) => void;
  onCustomize: (item: any) => void;
  priority?: boolean;
}

export const MenuItemCard = React.memo(function MenuItemCard({ item, onAdd, onCustomize, priority = false }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0;
  const isAvailable = item.isAvailable !== false; // assuming true if undefined
  
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
        "flex items-center justify-between p-4 bg-background border border-border shadow-sm transition-colors min-h-[120px] rounded-none cursor-pointer",
        !isAvailable && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="flex flex-col justify-between h-full flex-1 pr-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-base leading-tight text-foreground line-clamp-2">
              {item.name}
            </h3>
            {item.tags?.isSpicy && (
              <Badge variant="destructive" className="rounded-none px-1 py-0 text-[10px] uppercase">Spicy</Badge>
            )}
            {item.tags?.isPopular && (
              <Badge variant="default" className="rounded-none px-1 py-0 text-[10px] uppercase bg-amber-500 hover:bg-amber-600 text-white">Top</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
            {item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
          </p>
        </div>
        <div className="mt-2 font-bold text-foreground">
          Rs. {item.basePrice || item.price}
        </div>
      </div>

      <div className="relative shrink-0 flex flex-col items-end justify-between h-full">
        <div className="relative w-24 h-24 bg-muted border border-border">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <Utensils className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
          
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
              <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/60 px-2 py-1">
                Sold Out
              </span>
            </div>
          )}
          
          <button
            onClick={handleAdd}
            disabled={!isAvailable}
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 bg-background border border-border flex items-center justify-center shadow-md active:scale-95 transition-transform",
              hasVariants ? "text-primary" : "text-foreground",
              !isAvailable && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Add item"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});
