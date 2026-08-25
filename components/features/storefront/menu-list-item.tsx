"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { STORE_CONSTANTS } from "@/lib/constants";
import { Utensils } from "lucide-react";

interface MenuListItemProps {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  imageUrl?: string | null;
  hasVariants?: boolean;
}

export function MenuListItem({
  id,
  name,
  description,
  basePrice,
  imageUrl,
  hasVariants,
}: MenuListItemProps) {
  return (
    <Link 
      href={`/product/${id}`}
      className="group flex flex-col w-[160px] md:w-[220px] flex-shrink-0 bg-card rounded-2xl overflow-hidden hover:bg-muted/30 transition-all duration-300 border border-border/50 hover:border-primary/50 shadow-sm snap-start"
    >
      {/* Top (Image) */}
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden border-b border-border/50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 160px, 220px"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
            <Utensils className="w-8 h-8 opacity-20" />
          </div>
        )}
      </div>

      {/* Bottom (Content) */}
      <div className="flex flex-col flex-1 p-3 md:p-4">
        <h3 className="text-sm md:text-base font-bold tracking-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
            {description}
          </p>
        )}
        
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-sm md:text-base font-black text-primary">
            {STORE_CONSTANTS.CURRENCY} {basePrice}
          </span>
          {hasVariants && (
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
              Custom
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
