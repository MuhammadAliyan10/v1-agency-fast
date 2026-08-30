import { getPublicMenu } from "@/server/actions/storefront";
import { CategoryBento } from "@/components/features/storefront/category-bento";
import { TrendingSection } from "@/components/features/storefront/trending-section";
import { MapSection } from "@/components/features/storefront/map-section";
import ScrollVelocity from "@/components/ui/scroll-velocity";
import Image from "next/image";

export default async function StorefrontPage() {
  const { data } = await getPublicMenu();
  const categories = data || [];

  const heroPlaceholder = "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&h=600&fit=crop&q=80";

  return (
    <div className="animate-in fade-in duration-500 flex flex-col w-full">
      {/* Hero Section */}
      <section className="w-[100vw] h-[65vh] md:h-[80vh] relative left-1/2 -translate-x-1/2 -mt-4 md:-mt-8">
        <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center text-center px-4 md:px-6">
          <div className="max-w-4xl mt-16 md:mt-24 animate-in slide-in-from-bottom-4 duration-700 w-full">
            <span className="text-white font-mono uppercase tracking-[0.2em] text-[10px] md:text-sm mb-3 md:mb-4 block drop-shadow-md">
              PREMIUM FAST FOOD • EST. 2024
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-[6rem] font-serif font-black text-white leading-none mb-4 md:mb-6 drop-shadow-2xl text-balance uppercase tracking-tight">
              Classy Crave
            </h1>
            <p className="text-sm sm:text-base md:text-xl text-white/90 max-w-2xl mx-auto mb-8 md:mb-10 drop-shadow-md leading-relaxed text-pretty font-sans font-medium px-4">
              Based in Sillanwali, Pakistan. Crafted for the extraordinary craving.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 px-4 w-full sm:w-auto">
              <a href="/menu" className="w-full sm:w-auto inline-flex items-center justify-center h-12 md:h-14 px-8 md:px-10 rounded-full bg-white text-zinc-950 font-bold hover:bg-zinc-100 transition-transform active:scale-95 shadow-xl font-sans tracking-wide uppercase text-xs md:text-sm">
                Explore Menu
              </a>
              <a href="#trending" className="w-full sm:w-auto inline-flex items-center justify-center h-12 md:h-14 px-8 md:px-10 rounded-full bg-black/40 text-white font-bold backdrop-blur-md hover:bg-black/60 transition-colors border border-white/30 font-sans tracking-wide uppercase text-xs md:text-sm">
                View Deals
              </a>
            </div>
          </div>
        </div>
        <Image
          src={heroPlaceholder}
          className="object-cover"
          alt="Classy Crave Hero Banner"
          fill
          priority
        />
      </section>

      {/* Scroll Velocity Marquee */}
      <div className="w-[100vw] relative left-1/2 -translate-x-1/2 bg-white py-3 border-b border-zinc-200 overflow-hidden -mt-1 z-20">
        <ScrollVelocity
          texts={['CLASSY CRAVE']}
          velocity={40}
          className="text-zinc-950 font-bold font-mono text-xs md:text-sm tracking-widest uppercase mx-4"
          numCopies={10}
          damping={50}
          stiffness={400}
        />
      </div>

      {/* Trending Section */}
      {categories.length > 0 && (
        <TrendingSection categories={categories} />
      )}

      {/* Category Bento Grid */}
      <CategoryBento categories={categories} />

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center border rounded-2xl bg-muted/20">
          <h3 className="text-2xl font-bold mb-2">Menu is currently empty</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We are updating our delicious offerings. Please check back shortly!
          </p>
        </div>
      )}

      {/* Location Map */}
      <MapSection />
    </div>
  );
}
