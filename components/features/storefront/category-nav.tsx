"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = categories.map((c) => document.getElementById(c.slug));
      
      const scrollPosition = window.scrollY + 150; // offset for the sticky nav

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSlug(categories[i].slug);
          return;
        }
      }
      
      if (window.scrollY < 100) {
        setActiveSlug(null);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollToCategory = (slug: string) => {
    const element = document.getElementById(slug);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 120; // sticky header offset
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="sticky top-16 z-40 w-full border-b bg-background shadow-sm overflow-x-auto no-scrollbar">
      <div className="flex items-center max-w-7xl mx-auto px-4 py-3 gap-2 min-w-max">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "px-4 py-1.5  text-sm font-medium transition-colors border",
            !activeSlug
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted text-foreground border-border"
          )}
        >
          Top
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => scrollToCategory(category.slug)}
            className={cn(
              "px-4 py-1.5  text-sm font-medium transition-colors border",
              activeSlug === category.slug
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted text-foreground border-border"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
