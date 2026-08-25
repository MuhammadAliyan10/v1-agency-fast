import { getProductDetails } from "@/server/actions/product";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/features/storefront/product-gallery";
import { ProductOrderForm } from "@/components/features/storefront/product-order-form";
import { ProductReviews } from "@/components/features/storefront/product-reviews";
import { Star } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Top Image Section (Full Width Banner) */}
      <div className="w-screen relative left-1/2 -ml-[50vw] -mt-[120px]">
        <ProductGallery 
          imageUrl={item.imageUrl} 
          name={item.name} 
          categoryName={item.categoryName}
        />
      </div>
      
      {/* Content Container */}
      <main className="max-w-2xl mx-auto px-4 py-4 w-full">
        {/* Title & Price Row */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {item.name}
          </h1>
          <span className="text-lg font-bold text-primary shrink-0">
            Rs. {item.basePrice}
          </span>
        </div>
        
        {/* Rating & Reviews */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span className="font-bold text-foreground">{item.averageRating || 0}</span>
          <span>({item.reviewCount || 0} Reviews)</span>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
        </p>

        <ProductOrderForm item={item} />

        <Separator className="my-6 bg-border/50" />

        <ProductReviews 
          menuItemId={item.id} 
          reviews={item.reviews || []} 
          averageRating={item.averageRating || 0}
          reviewCount={item.reviewCount || 0}
        />
      </main>
    </div>
  );
}
