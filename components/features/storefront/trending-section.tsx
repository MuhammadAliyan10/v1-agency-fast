"use client";

import * as React from "react";
import Link from "next/link";
import { ProductCard } from "./product-card";
import { ProductDialog } from "./product-dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  items: any[];
}

interface TrendingSectionProps {
  categories: Category[];
  title?: string;
}

export function TrendingSection({ categories, title = "Trending" }: TrendingSectionProps) {
  const validCategories = categories?.filter(c => c.items?.length > 0) || [];

  // Target specific categories requested by user
  const targetKeywords = ["burger", "pizza", "drink", "dessert"];
  const displayCategories = validCategories.filter(c =>
    targetKeywords.some(keyword => c.name.toLowerCase().includes(keyword))
  ).slice(0, 4);

  // Fallback padding if strict matches aren't found
  if (displayCategories.length < 4) {
    const missing = validCategories.filter(c => !displayCategories.find(dc => dc.id === c.id));
    displayCategories.push(...missing.slice(0, 4 - displayCategories.length));
  }

  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(displayCategories[0]?.id || "");
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  if (!displayCategories.length) return null;

  const activeCategory = displayCategories.find(c => c.id === activeCategoryId) || displayCategories[0];
  const activeItems = activeCategory.items || [];

  return (
    <section className="py-12 md:py-24 w-full px-2 md:px-4 max-w-9xl mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pl-4 md:pl-6 pr-4 md:pr-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-bold text-2xl md:text-3xl text-zinc-950 font-sans tracking-tight uppercase">
              {title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 font-medium">
              Help you to find what you needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static transform-none bg-transparent hover:bg-zinc-50 border-none shadow-none text-zinc-400 w-8 h-8" />
            <CarouselNext className="static transform-none bg-transparent hover:bg-zinc-50 border-none shadow-none text-zinc-400 w-8 h-8" />
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch">
          
          {/* Mobile Categories (Horizontal Pills) */}
          <div className="flex md:hidden overflow-x-auto gap-2 pl-4 pr-4 pb-2 scrollbar-hide snap-x relative z-10 w-full">
            {displayCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold transition-all border snap-start whitespace-nowrap",
                    isActive
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>

          {/* Desktop Categories (Vertical Sidebar) */}
          <div className="hidden md:flex w-20 shrink-0 flex-col justify-center gap-6 py-8 items-center pl-4 relative">
            {displayCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              const displayName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase();
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "relative text-xs font-bold tracking-wide transition-all duration-300 py-4 px-2 whitespace-nowrap",
                    isActive
                      ? "text-[#5430E5]"
                      : "text-zinc-300 hover:text-zinc-500"
                  )}
                  style={{ 
                    writingMode: 'vertical-rl', 
                    transform: `rotate(180deg) ${isActive ? 'translateX(10px)' : ''}` 
                  }}
                >
                  {isActive && (
                    <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-[#5430E5]" />
                  )}
                  {displayName}
                </button>
              );
            })}
          </div>

          {/* Carousel Viewport */}
          <div className="flex-1 overflow-hidden pb-8 md:pt-4">
            <CarouselContent className="ml-0 md:-ml-4">
              {activeItems.map((item, index) => (
                <CarouselItem
                  key={item.id || index}
                  className="pl-2 md:pl-4 basis-[55%] sm:basis-[45%] md:basis-[40%] lg:basis-1/3 xl:basis-[28%] 2xl:basis-1/4"
                >
                  <div className="h-full">
                    <ProductCard
                      id={item.id}
                      name={item.name}
                      description={item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
                      basePrice={item.basePrice || item.price || 500}
                      imageUrl={item.imageUrl}
                      categoryName={item.category?.name || activeCategory.name}
                      outOfStock={!item.isAvailable}
                      onCustomize={() => setSelectedItem(item)}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>
        </div>
      </Carousel>

      <ProductDialog
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
