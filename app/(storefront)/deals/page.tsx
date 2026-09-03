// app/(storefront)/deals/page.tsx
import { getPublicDeals } from "@/server/actions/deals";
import { STORE_CONSTANTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tag, Sparkles, Flame, ShieldCheck, ArrowRight } from "lucide-react";
import { DealCard, DealItem } from "@/components/features/storefront/deal-customizer-drawer";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { data: deals } = await getPublicDeals();
  const activeDeals = (deals || []) as unknown as DealItem[];

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-24 pt-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden bg-zinc-950 text-white p-6 md:p-10 mb-8 border border-zinc-800 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Exclusive Savings
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight leading-tight mb-3">
              Deals & Combo Offers
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6 font-medium">
              Handpicked multi-item meals, limited time combos & event promotions crafted for maximum savings and unbeatable taste.
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" /> Up to 40% Off Combos
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Hot & Fresh Delivery
              </div>
            </div>
          </div>
        </div>

        {/* Deals Content Section */}
        {activeDeals.length === 0 ? (
          <div className="bg-white border border-zinc-200 p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-20 h-20 bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Tag className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-heading font-black text-zinc-950 mb-2">No active deals right now</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              We update our special combos and event deals regularly. Browse our full menu in the meantime!
            </p>
            <Button asChild className="h-12 px-6 font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded-none">
              <Link href="/menu">
                Explore Full Menu <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-200">
              <h2 className="text-xl font-heading font-black text-zinc-950 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" /> Active Deals ({activeDeals.length})
              </h2>
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                Select a deal to configure & order
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {activeDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
