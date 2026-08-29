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
  
  const defaultImages = [
    "https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&h=800&fit=crop&q=80", // Burgers
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop&q=80", // Pizza
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=800&fit=crop&q=80"  // Drinks
  ];

  return (
    <section className="py-12 w-full">
      <SectionHeader title="Explore Our Menu" actionLabel="View All" actionHref="/menu?category=all" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 h-auto md:h-[500px]">
        {displayCategories.map((category, index) => {
          // First item spans 2 cols, 2 rows on desktop
          const isFeatured = index === 0;
          
          return (
            <Link
              key={category.id || index}
              href={`/menu?category=${category.slug || "all"}`}
              className={cn(
                "group relative overflow-hidden rounded-xl flex flex-col justify-end min-h-[250px] md:min-h-0",
                isFeatured ? "md:col-span-2 md:row-span-2" : "md:col-span-1 md:row-span-1"
              )}
            >
              <Image
                src={defaultImages[index % defaultImages.length]}
                alt={category.name || "Category"}
                fill
                sizes={isFeatured ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-90" />
              
              <div className="relative z-10 p-5 md:p-8">
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-1 md:mb-2 tracking-tight">
                  {category.name}
                </h3>
                <p className="text-xs md:text-sm text-zinc-300 font-medium line-clamp-1">
                  {category.description || "Discover our premium selection"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
