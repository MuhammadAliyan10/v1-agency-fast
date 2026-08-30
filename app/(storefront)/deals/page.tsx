// app/(storefront)/deals/page.tsx
import { getPublicDeals } from "@/server/actions/deals";
import { STORE_CONSTANTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tag, Clock, ArrowRight } from "lucide-react";
import { DealAddToCart } from "@/components/features/storefront/deal-add-to-cart";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { data: deals } = await getPublicDeals();
  const activeDeals = deals || [];

  return (
    <div className="px-4 md:px-8 pb-16 pt-4">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Limited Time</p>
        <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight">Deals & Offers</h1>
        <p className="text-muted-foreground text-sm mt-1">Exclusive combos and event specials — grab them while they last.</p>
      </div>

      {activeDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tag className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-zinc-950">No active deals right now</h2>
          <p className="text-muted-foreground text-sm mt-2">Check back soon — we run specials on events and weekends!</p>
          <Button asChild variant="outline" className="mt-6 rounded-sm">
            <Link href="/menu">Browse Menu</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {activeDeals.map((deal) => {
            const savings = deal.originalPrice - deal.dealPrice;
            const savingsPct = Math.round((savings / deal.originalPrice) * 100);
            const isExpiringSoon = deal.validUntil
              ? (new Date(deal.validUntil).getTime() - Date.now()) < 24 * 60 * 60 * 1000
              : false;

            return (
              <div key={deal.id} className="bg-white border border-border/50 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Image / Banner */}
                {deal.imageUrl ? (
                  <div className="relative aspect-[16/9] bg-muted">
                    <img src={deal.imageUrl} alt={deal.name} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge className="bg-primary text-white text-xs font-black px-2 py-0.5 rounded-sm">
                        {savingsPct}% OFF
                      </Badge>
                      {deal.dealType === "event" && deal.eventLabel && (
                        <Badge variant="secondary" className="text-xs font-bold rounded-sm">{deal.eventLabel}</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Tag className="w-12 h-12 text-primary/30" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge className="bg-primary text-white text-xs font-black px-2 py-0.5 rounded-sm">{savingsPct}% OFF</Badge>
                      {deal.dealType === "event" && deal.eventLabel && (
                        <Badge variant="secondary" className="text-xs font-bold rounded-sm">{deal.eventLabel}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <h2 className="font-heading font-black text-lg tracking-tight leading-tight mb-1">{deal.name}</h2>
                  {deal.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{deal.description}</p>}

                  {/* Items included */}
                  {deal.items && (deal.items as any[]).length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Includes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(deal.items as any[]).map((item, idx) => (
                          <span key={idx} className="text-xs bg-muted/60 px-2 py-0.5 font-medium">
                            {item.quantity}x {item.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpiringSoon && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-600 font-bold mb-3">
                      <Clock className="w-3 h-3 animate-pulse" /> Expires soon!
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                    <div>
                      <p className="text-lg font-black text-foreground">{STORE_CONSTANTS.CURRENCY} {deal.dealPrice}</p>
                      <p className="text-xs text-muted-foreground line-through">{STORE_CONSTANTS.CURRENCY} {deal.originalPrice}</p>
                    </div>
                    <DealAddToCart deal={deal as any} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
