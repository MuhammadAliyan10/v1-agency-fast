"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { MenuItemCard } from "./menu-item-card";
import { ProductDetailDrawer } from "./product-detail-drawer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  variants: any[];
  isAvailable?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
}

interface MenuClientProps {
  categories: Category[];
  isStoreOpen?: boolean;
}

export function MenuClient({ categories, isStoreOpen = true }: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const addItem = useCartStore(state => state.addItem);

  // Filter categories and items based on search term
  const validCategories = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    return categories.reduce((acc: Category[], category) => {
      const matchedItems = category.items?.filter(item => 
        item.name.toLowerCase().includes(term) || 
        (item.description && item.description.toLowerCase().includes(term))
      ) || [];
      
      // If category has matches, include it
      if (matchedItems.length > 0) {
        acc.push({ ...category, items: matchedItems });
      }
      return acc;
    }, []);
  }, [categories, searchTerm]);

  // Create refs for scroll spy
  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const scrollToCategory = (slug: string) => {
    setActiveCategory(slug);
    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    if (slug === "all") {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = categoryRefs.current[slug];
    if (element) {
      // Offset by navbar height + sticky header height (~180px with search)
      const y = element.getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top - 180;
      container.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleQuickAdd = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      unitPrice: Number(item.basePrice ?? item.price) || 0,
      quantity: 1,
      imageUrl: item.imageUrl ?? null,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="w-full relative pb-[140px]">
      {/* Sticky Header Group: Search + Categories */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border w-full shadow-sm">
        
        {/* Search Bar */}
        <div className="p-3 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for your favorite food..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 h-12 rounded-none bg-muted/50 border-border focus-visible:ring-primary focus-visible:ring-1"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Category Nav */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 p-3">
            <button
              onClick={() => scrollToCategory("all")}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-all border rounded-none min-h-[48px]",
                activeCategory === "all"
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {validCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.slug)}
                className={cn(
                  "px-4 py-2 text-sm font-bold transition-all border rounded-none min-h-[48px]",
                  activeCategory === category.slug
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Menu Feed */}
      <div className="flex flex-col w-full">
        {validCategories.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              We couldn't find any matches for "{searchTerm}".
            </p>
            <Button onClick={() => setSearchTerm("")} className="rounded-none font-bold h-12 px-8">
              Clear Search
            </Button>
          </div>
        ) : (
          validCategories.map((category, catIndex) => (
            <section 
              key={category.id} 
              id={category.slug}
              ref={(el) => { categoryRefs.current[category.slug] = el; }}
              className="scroll-mt-[190px]"
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}
            >
              <div className="bg-muted/30 px-4 py-3 border-b border-border">
                <h2 className="font-bold text-lg text-foreground tracking-tight">{category.name}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/10 md:grid-cols-3 lg:grid-cols-4">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={{ ...item, isAvailable: isStoreOpen ? (item.isAvailable !== false) : false }}
                    onAdd={handleQuickAdd}
                    onCustomize={(item) => setSelectedItem(item)}
                    priority={catIndex === 0}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Product Customization Drawer */}
      <ProductDetailDrawer
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
