// components/features/admin/menu/menu-stats.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, CheckCircle2, Star, Banknote, XCircle } from "lucide-react";
import type { MenuStats } from "@/server/actions/menu";

interface MenuStatsProps {
  stats: MenuStats;
}

interface StatCardDef {
  key: keyof MenuStats;
  label: string;
  icon: any;
  colorClass: string;
  prefix?: string;
}

const STAT_CARDS: StatCardDef[] = [
  { key: "totalItems",       label: "Total Items",   icon: UtensilsCrossed, colorClass: "text-primary" },
  { key: "availableItems",   label: "Available",     icon: CheckCircle2,    colorClass: "text-emerald-600" },
  { key: "unavailableItems", label: "Unavailable",   icon: XCircle,         colorClass: "text-rose-500" },
  { key: "featuredItems",    label: "Featured",      icon: Star,            colorClass: "text-amber-500" },
  { key: "avgBasePrice",     label: "Avg Price",     icon: Banknote,        colorClass: "text-blue-600", prefix: "Rs. " },
];

export function MenuStats({ stats }: MenuStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {STAT_CARDS.map(card => {
        const raw = stats[card.key as keyof MenuStats];
        const display = `${card.prefix ?? ""}${Number(raw).toLocaleString()}`;
        const Icon = card.icon;
        return (
          <Card key={card.key} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </CardTitle>
              <Icon className={`w-4 h-4 ${card.colorClass}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-black tracking-tight">{display}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
