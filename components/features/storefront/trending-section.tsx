"use client";

import * as React from "react";
import { ProductCard } from "./product-card";
import { SectionHeader } from "./section-header";
import { ProductDialog } from "./product-dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TrendingSectionProps {
  items: any[];
  title?: string;
  description?: string;
}

export function TrendingSection({ items, title = "Trending Now", description = "Our most loved signature dishes" }: TrendingSectionProps) {
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-12 w-full">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <SectionHeader 
          title={title} 
          description={description} 
          actionLabel="View Menu" 
          actionHref="/?category=all" 
        >
          <div className="hidden sm:flex items-center gap-2">
            <CarouselPrevious className="static transform-none bg-background hover:bg-muted border shadow-sm text-foreground w-10 h-10" />
            <CarouselNext className="static transform-none bg-background hover:bg-muted border shadow-sm text-foreground w-10 h-10" />
          </div>
        </SectionHeader>
        
        <div className="relative">
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((item, index) => (
              <CarouselItem 
                key={item.id || index} 
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <div className="p-1 h-full">
                  <ProductCard
                    id={item.id}
                    name={item.name}
                    description={item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
                    basePrice={item.basePrice || item.price || 500}
                    imageUrl={item.imageUrl}
                    categoryName={undefined}
                    tags={{
                      isPopular: item.isFeatured,
                    }}
                    variants={item.variants?.length > 0 ? item.variants : undefined}
                    onCustomize={() => {
                      setSelectedItem(item);
                    }}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>

      <ProductDialog 
        isOpen={!!selectedItem} 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
      />
    </section>
  );
}
