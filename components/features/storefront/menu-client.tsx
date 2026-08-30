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
    <div className="flex flex-col md:flex-row w-full max-w-[1400px] mx-auto pb-24 md:pb-12 pt-8 px-4 md:px-8 gap-8">
      {/* Left Sidebar (Fixed on Desktop) */}
      <aside className="w-full md:w-[25%] shrink-0 flex flex-col gap-6 md:sticky md:top-[100px] md:h-[calc(100vh-120px)] overflow-y-auto pr-2 md:pr-4 scrollbar-hide">
        {/* Search Bar */}
        <div className="relative w-full group">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-950 transition-colors stroke-[1.5]" />
          <Input
            type="text"
            placeholder="Search our menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-12 bg-transparent border-0 border-b border-zinc-200 shadow-none focus-visible:ring-0 focus-visible:border-zinc-950 rounded-none text-base md:text-lg font-serif transition-colors px-0 placeholder:text-zinc-400 placeholder:font-sans placeholder:text-base"
          />
        </div>

        {/* Category Filters (Keyword Pills) */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-all border",
              activeCategory === "all"
                ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.slug)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                activeCategory === category.slug
                  ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area (Products Grid) */}
      <main className="w-full md:w-[75%]">
        {flatItems.length === 0 ? (
          <div className="px-4 py-24 text-center bg-zinc-50 rounded-[24px] border border-zinc-100 flex flex-col items-center justify-center">
            <h3 className="text-xl font-bold text-zinc-950">No items found</h3>
            <p className="text-sm text-zinc-500 mt-2 font-medium">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-6">
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
      </main>

      <ProductDialog
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
