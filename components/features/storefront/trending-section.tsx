"use client";

import React, { useState } from "react";
import { MenuItemCard } from "./menu-item-card";
import { ProductDetailDrawer } from "./product-detail-drawer";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";

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

  // Flatten and extract featured/bestseller items
  const allItems = categories.flatMap(c => c.items || []);
  const featuredItems = allItems.filter(item => item.tags?.isPopular || item.tags?.isSpicy).slice(0, 10);
  
  // If no featured items explicitly found, just take the first 8 available items
  const displayItems = featuredItems.length > 0 ? featuredItems : allItems.filter(i => i.isAvailable !== false).slice(0, 8);

  if (!displayItems.length) return null;

  const handleQuickAdd = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.basePrice || item.price,
      quantity: 1,
      options: { imageUrl: item.imageUrl }
    });
    toast.success("Added to cart");
  };

  return (
    <section className="py-8 w-full border-b border-border bg-background">
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="font-bold text-xl tracking-tight text-foreground uppercase">{title}</h2>
      </div>

      <div className="w-full relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 pb-4 gap-4">
          {displayItems.map((item) => (
            <div key={item.id} className="snap-start shrink-0 w-[85vw] max-w-[320px] shadow-sm border border-border">
              <MenuItemCard
                item={item}
                onAdd={handleQuickAdd}
                onCustomize={(item) => setSelectedItem(item)}
              />
            </div>
          ))}
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
