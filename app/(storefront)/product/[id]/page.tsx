import { getProductDetails } from "@/server/actions/product";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/features/storefront/product-gallery";
import { ProductOrderForm } from "@/components/features/storefront/product-order-form";
import { ProductReviews } from "@/components/features/storefront/product-reviews";
import { TrendingSection } from "@/components/features/storefront/trending-section";
import { Star, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProductPageProps {
  params: {
    id: string;
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const result = await getProductDetails(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const item = result.data;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 pb-0">
      {/* Top Image Section */}
      <div className="w-full relative z-0">
        <ProductGallery 
          imageUrl={item.imageUrl} 
          name={item.name} 
          categoryName={item.category?.name || ""}
        />
      </div>
      
      {/* Content Container (Bottom Sheet Style) */}
      <main className="w-full max-w-7xl mx-auto -mt-10 bg-white rounded-t-[32px] px-5 py-6 md:px-8 md:py-10 relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex-1 pb-32">
        {/* Title & Price Row */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-foreground leading-tight">
            {item.name}
          </h1>
          <span className="text-xl md:text-2xl font-black text-foreground shrink-0 mt-1">
            Rs. {item.basePrice}
          </span>
        </div>
        
        {/* Rating & Reviews */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="font-bold text-foreground">{item.averageRating || 0}</span>
            <span>({item.reviewCount || 0} Reviews)</span>
          </span>
          {item.preparationTime && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Ready in ~{item.preparationTime} mins
              </span>
            </>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
        </p>

        <ProductOrderForm item={item} globalAddons={item.globalAddons || []} />

        <Separator className="my-6 bg-border/50" />

        <ProductReviews 
          menuItemId={item.id} 
          reviews={item.reviews || []} 
          averageRating={item.averageRating || 0}
          reviewCount={item.reviewCount || 0}
        />

        {/* Recommended Items Slider */}
        {item.recommendedItems && item.recommendedItems.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <TrendingSection 
              categories={[{ id: 'rec', name: 'Recommended', items: item.recommendedItems }]} 
              title="Recommended For You" 
            />
          </div>
        )}
      </main>
    </div>
  );
}
