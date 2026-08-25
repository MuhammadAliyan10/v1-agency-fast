"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, Flame, Leaf, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORE_CONSTANTS } from "@/lib/constants";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string;
  categoryName?: string;
  rating?: number;
  reviewCount?: number;
  tags?: {
    isPopular?: boolean;
    isSpicy?: boolean;
    isVeg?: boolean;
  };
  outOfStock?: boolean;
  variants?: { id: string; name: string; price: number }[];
  discountPercentage?: number;
  onAdd?: (id: string) => void;
  onCustomize?: (id: string) => void;
  item?: any; // Full item reference
}

export function ProductCard({
  id,
  name,
  description,
  basePrice,
  imageUrl,
  categoryName,
  rating,
  reviewCount = 0,
  tags,
  outOfStock,
  variants = [],
  discountPercentage,
  onAdd,
  onCustomize,
  item,
}: ProductCardProps) {
  const { addItem } = useCart();
  const fallbackImage = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80";

  const hasVariants = variants && variants.length > 0;
  const lowestPrice = hasVariants ? Math.min(...variants.map(v => v.price)) : basePrice;
  const displayPrice = lowestPrice || basePrice;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (outOfStock) return;

    if (hasVariants) {
      if (onCustomize) onCustomize(id);
    } else {
      if (onAdd) {
        onAdd(id);
      } else {
        addItem({
          menuItemId: id,
          name: name,
          imageUrl: imageUrl || fallbackImage,
          basePrice: basePrice,
          quantity: 1,
          unitPrice: basePrice,
          subtotal: basePrice,
        });
        toast.success(`${name} added to cart!`);
      }
    }
  };

  const handleCardClick = () => {
    if (outOfStock) return;
    if (onCustomize) onCustomize(id);
  };

  return (
    <article 
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-500",
        outOfStock ? "opacity-75" : "hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-primary/5",
        "h-full"
      )}
    >
      <Link href={`/product/${id}`} className="flex flex-col flex-1 cursor-pointer">
        {/* Image Header (Top Section) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl || fallbackImage}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
        
        {/* Badges */}
        {tags?.isPopular && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Flame className="w-3 h-3" />
            Popular
          </div>
        )}
        
        {discountPercentage && discountPercentage > 0 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            -{discountPercentage}% OFF
          </div>
        )}

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-white font-bold tracking-widest uppercase border-2 border-white/50 px-4 py-2 rounded-full rotate-[-15deg] shadow-2xl">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content Body (Middle Section) */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {/* Row 1: Title & Dietary */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          
          {(tags?.isSpicy || tags?.isVeg) && (
            <div className="flex gap-1 shrink-0 mt-0.5">
              {tags?.isSpicy && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 p-1 rounded-full" title="Spicy">
                  <Flame className="w-3 h-3" />
                </div>
              )}
              {tags?.isVeg && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 p-1 rounded-full" title="Vegetarian">
                  <Leaf className="w-3 h-3" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Rating & Category */}
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
          {rating ? (
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-foreground ml-0.5">{rating}</span>
              {reviewCount > 0 && <span className="text-muted-foreground font-normal">({reviewCount})</span>}
            </div>
          ) : null}
          
          {rating && categoryName && <span>•</span>}
          
          {categoryName && (
            <span className="truncate">{categoryName}</span>
          )}
        </div>

        {/* Row 3: Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1 flex-grow">
          {description || "Fresh, delicious, and made just for you with the finest ingredients."}
        </p>
      </div>
      </Link>

      {/* Footer (Price & Action) */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50 px-5 pb-5 bg-card/50">
        <div className="flex flex-col">
          {hasVariants && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground leading-none mb-1">
              Starts from
            </span>
          )}
          <div className="flex items-baseline gap-2 leading-none">
            <span className="text-xl font-black text-primary">
              {STORE_CONSTANTS.CURRENCY} {displayPrice}
            </span>
            {discountPercentage && discountPercentage > 0 && (
              <span className="text-xs font-medium text-muted-foreground line-through opacity-70">
                {STORE_CONSTANTS.CURRENCY} {Math.round(displayPrice / (1 - discountPercentage / 100))}
              </span>
            )}
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={handleAction}
          disabled={outOfStock}
          variant={hasVariants ? "outline" : "default"}
          className={cn(
            "rounded-xl font-bold shadow-sm hover:shadow-md transition-transform active:scale-95 shrink-0 px-4",
            hasVariants ? "border-primary text-primary hover:bg-primary/10" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {outOfStock ? (
            "Sold Out"
          ) : hasVariants ? (
            <>
              <Settings2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline-block">Customize</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline-block">Add</span>
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
