"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, MapPin, Star } from "lucide-react";
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
  const router = useRouter();
  const { addItem } = useCart();
  const fallbackImage = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80";

  const hasVariants = variants && variants.length > 0;
  const lowestPrice = hasVariants ? Math.min(...variants.map(v => v.price)) : basePrice;
  const displayPrice = lowestPrice || basePrice;

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (outOfStock) return;

    if (hasVariants && onCustomize) {
      onCustomize(id);
    } else {
      if (onAdd) {
        onAdd(id);
      } else {
        addItem({
          menuItemId: id,
          name: name,
          imageUrl: imageUrl || fallbackImage,
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
    router.push(`/product/${id}`);
  };

  return (
    <div className="w-full h-full group/card transition-transform duration-300 hover:scale-[1.02]">
          <article 
            onClick={handleCardClick}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-[20px] md:rounded-[24px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 h-full p-2 md:p-3 pb-3 md:pb-4 border border-zinc-100 cursor-pointer",
              outOfStock ? "opacity-75" : ""
            )}
          >
            <div className="flex flex-col flex-1">
              {/* Image Header */}
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-50 rounded-[14px] md:rounded-2xl">
                <Image
                  src={imageUrl || fallbackImage}
                  alt={name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              {/* Content Body */}
              <div className="flex flex-col pt-3 md:pt-4 px-1 md:px-2">
                <div className="flex items-center gap-1.5 md:gap-2">
                  {rating ? (
                    <div className="flex items-center gap-0.5 md:gap-1 shrink-0 bg-amber-50 px-1.5 md:px-2 py-0.5 rounded-full border border-amber-100">
                      <Star className="w-2 h-2 md:w-2.5 md:h-2.5 fill-amber-500 text-amber-500" />
                      <span className="text-[9px] md:text-xs font-bold text-amber-900">{rating}</span>
                    </div>
                  ) : null}
                  <h3 className="font-sans font-bold text-xs md:text-base leading-tight tracking-tight text-zinc-950 line-clamp-1 group-hover:text-[#5430E5] transition-colors">
                    {name}
                  </h3>
                </div>
                <p className="text-[9px] md:text-xs text-zinc-400 font-medium line-clamp-2 mt-1 md:mt-1.5 leading-relaxed">
                  {description || "Fresh, delicious, and made just for you with the finest ingredients."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 md:mt-5 flex items-center justify-between px-1 md:px-2 relative z-[50]">
              <div className="flex items-baseline gap-1">
                <span className="text-xs md:text-base font-black text-zinc-950 tracking-tight">
                  {STORE_CONSTANTS.CURRENCY}{displayPrice}
                </span>
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAction(e);
                }}
                disabled={outOfStock}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-2 md:px-4 py-1.5 h-auto rounded-md shadow-none transition-colors border-none relative z-[100] cursor-pointer pointer-events-auto shrink-0"
              >
                {outOfStock ? "Sold Out" : hasVariants ? "Customize" : "Add to Cart"}
              </button>
            </div>
          </article>
    </div>
  );
}
