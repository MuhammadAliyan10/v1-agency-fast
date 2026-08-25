import { getPublicMenu } from "@/server/actions/storefront";
import { CategoryBento } from "@/components/features/storefront/category-bento";
import { PromoBanner } from "@/components/features/storefront/promo-banner";
import { TrendingSection } from "@/components/features/storefront/trending-section";
import { FeaturesSection } from "@/components/features/storefront/features-section";
import { MapSection } from "@/components/features/storefront/map-section";
import Image from "next/image";

export default async function StorefrontPage() {
  const { data } = await getPublicMenu();
  const categories = data || [];

  const heroPlaceholder = "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&h=600&fit=crop&q=80";

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-4 md:gap-8 w-full">
      {/* Hero Section */}
      <section className="rounded-3xl overflow-hidden relative w-full h-[300px] md:h-[400px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10 flex flex-col justify-center px-6 md:px-16 text-white">
          <span className="text-primary font-bold uppercase tracking-widest text-xs md:text-sm mb-2 shadow-black drop-shadow-md">
            Classy Crave Sillanwali
          </span>
          <h1 className="text-3xl md:text-6xl font-black max-w-xl leading-tight mb-4 drop-shadow-lg">
            Craving Something <span className="text-primary">Extraordinary?</span>
          </h1>
          <p className="text-sm md:text-lg text-white/90 max-w-md line-clamp-2 md:line-clamp-none drop-shadow-md">
            Premium fast food crafted with the finest ingredients. Delivered hot and fresh right to your doorstep.
          </p>
        </div>
        <Image 
          src={heroPlaceholder} 
          className="object-cover" 
          alt="Premium Fast Food Banner" 
          fill
          priority
        />
      </section>

      {/* Trending Section */}
      {categories.length > 0 && categories[0].items.length > 0 && (
        <TrendingSection items={categories.flatMap(c => c.items).slice(0, 8)} />
      )}

      {/* Category Bento Grid */}
      <CategoryBento categories={categories} />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center border rounded-2xl bg-muted/20">
          <h3 className="text-2xl font-bold mb-2">Menu is currently empty</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We are updating our delicious offerings. Please check back shortly!
          </p>
        </div>
      )}

      {/* Trust / Features Section */}
      <FeaturesSection />

      {/* Location Map */}
      <MapSection />
    </div>
  );
}
