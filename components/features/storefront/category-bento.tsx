"use client";

import Link from "next/link";
import Image from "next/image";
import { SectionHeader } from "./section-header";
import { cn } from "@/lib/utils";

interface CategoryBentoProps {
  categories: any[];
}

export function CategoryBento({ categories }: CategoryBentoProps) {
  if (!categories || categories.length === 0) return null;

  // We need at least 3 categories to fill the bento box nicely.
  // We'll pad with static data if there are less than 3 for demonstration.
  const displayCategories = categories.slice(0, 3);
  
  const getCategoryImage = (category: any) => {
    if (category.imageUrl) return category.imageUrl;
    
    const name = (category.name || "").toLowerCase();
    if (name.includes("burger") || name.includes("zinger")) return "https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&h=800&fit=crop&q=80";
    if (name.includes("pizza")) return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop&q=80";
    if (name.includes("drink") || name.includes("beverage") || name.includes("shake")) return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=800&fit=crop&q=80";
    if (name.includes("chicken") || name.includes("fried") || name.includes("nugget")) return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&h=800&fit=crop&q=80";
    if (name.includes("fries") || name.includes("side")) return "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800&h=800&fit=crop&q=80";
    if (name.includes("wrap") || name.includes("shawarma") || name.includes("roll")) return "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&h=800&fit=crop&q=80";
    
    // Default fallback
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=800&fit=crop&q=80";
  };

  return (
    <section className="py-12 w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader title="Explore Our Menu" actionLabel="View All" actionHref="/menu?category=all" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 md:grid-rows-2 gap-3 md:gap-4 h-auto md:h-[500px]">
          {displayCategories.map((category, index) => {
          // First item spans 2 cols on mobile, and 2 cols/2 rows on desktop
          const isFeatured = index === 0;
          
          return (
            <Link
              key={category.id || index}
              href={`/menu?category=${category.slug || "all"}`}
              className={cn(
                "group relative overflow-hidden  flex flex-col justify-end min-h-[160px] md:min-h-0",
                isFeatured ? "col-span-2 md:col-span-2 md:row-span-2" : "col-span-1 md:col-span-1 md:row-span-1"
              )}
            >
              <Image
                src={getCategoryImage(category)}
                alt={category.name || "Category"}
                fill
                sizes={isFeatured ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 50vw, 33vw"}
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-90" />
              
              <div className="relative z-10 p-4 md:p-8">
                <h3 className="text-xl md:text-3xl font-serif font-bold text-white mb-1 md:mb-2 tracking-tight leading-tight">
                  {category.name}
                </h3>
                <p className="text-[10px] md:text-sm text-zinc-300 font-medium line-clamp-1">
                  {category.description || "Discover our premium selection"}
                </p>
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </section>
  );
}
