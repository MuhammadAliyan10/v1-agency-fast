"use client";

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { ProductDialog } from "./product-dialog";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  variants: any[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
}

interface MenuClientProps {
  categories: Category[];
}

export function MenuClient({ categories }: MenuClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Filter by active category pill
    if (activeCategory !== "all") {
      filtered = filtered.filter(c => c.slug === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.map(category => ({
        ...category,
        items: category.items.filter(item =>
          item.name.toLowerCase().includes(lowerQuery) ||
          (item.description?.toLowerCase().includes(lowerQuery))
        )
      })).filter(category => category.items.length > 0);
    }

    return filtered;
  }, [categories, activeCategory, searchQuery]);

  const flatItems = useMemo(() => {
    return filteredCategories.flatMap(c =>
      c.items.map(item => ({ ...item, categoryName: c.name }))
    );
  }, [filteredCategories]);

  return (
    <div className="flex flex-col w-full pb-24">
      {/* Sticky Top Bar (Search & Filter) */}
      <div className="sticky top-[64px] z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm pt-4 pb-3">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col gap-3">

          {/* Search Bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for your cravings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-transparent focus-visible:ring-primary/20 rounded-xl"
            />
          </div>

          {/* Category Pills */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border",
                activeCategory === "all"
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-background border-border/50 text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.slug)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border",
                  activeCategory === category.slug
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-8xl mx-auto w-full px-4 md:px-8 lg:px-12 mt-6 md:mt-8">
        {flatItems.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <h3 className="text-lg font-bold">No items found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
            {flatItems.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
                basePrice={item.basePrice || 500}
                imageUrl={item.imageUrl || undefined}
                categoryName={item.categoryName}
                variants={item.variants?.length > 0 ? item.variants : undefined}
                onCustomize={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      <ProductDialog
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
