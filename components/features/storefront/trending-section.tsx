"use client";

import React, { useState } from "react";
import { MenuItemCard } from "./menu-item-card";
import { ProductDetailDrawer } from "./product-detail-drawer";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  items: any[];
}

interface TrendingSectionProps {
  categories: Category[];
  title?: string;
}

export function TrendingSection({ categories, title = "Bestsellers" }: TrendingSectionProps) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const addItem = useCartStore(state => state.addItem);

  const allItems = categories.flatMap(c => c.items || []).filter(i => i.isAvailable !== false);

  // Check top-level isFeatured as well as tags
  const featuredItems = allItems.filter(
    item => item.isFeatured || item.tags?.isFeatured || item.tags?.isPopular || item.tags?.isSpicy
  );

  // Fallback to first 8 available items if no tags exist so section is never blank
  const displayItems = featuredItems.length > 0 ? featuredItems.slice(0, 8) : allItems.slice(0, 8);

  if (!displayItems.length) return null;

  const handleQuickAdd = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      unitPrice: Number(item.basePrice ?? item.price) || 0,
      quantity: 1,
      imageUrl: item.imageUrl ?? null,
    });
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <section className="py-8 md:py-10 w-full border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-xl md:text-2xl tracking-tight text-zinc-950 uppercase">{title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Our top featured and most popular creations.</p>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider shrink-0 gap-0.5"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div className="w-full relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide gap-4 pb-2">
            {displayItems.map((item, idx) => (
              <div key={item.id} className="snap-start shrink-0 w-[72vw] max-w-[260px]">
                <MenuItemCard
                  item={item}
                  onAdd={handleQuickAdd}
                  onCustomize={(item) => setSelectedItem(item)}
                  priority={idx < 2}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProductDetailDrawer
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
