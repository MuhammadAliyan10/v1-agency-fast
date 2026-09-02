// components/features/admin/finance/finance-date-filter.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarDays, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FinanceDateFilterProps {
  from?: string;
  to?: string;
}

const PRESETS = [
  { key: "today",   label: "Today"   },
  { key: "week",    label: "7 Days"  },
  { key: "month",   label: "Month"   },
  { key: "quarter", label: "Quarter" },
] as const;

type PresetKey = typeof PRESETS[number]["key"];

export function FinanceDateFilter({ from, to }: FinanceDateFilterProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(from ?? "");
  const [dateTo,   setDateTo  ] = useState(to   ?? "");

  const push = (f: string, t: string) => {
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to",   t);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const applyCustom = () => {
    if (dateFrom && dateTo) push(dateFrom, dateTo);
  };

  const applyPreset = (preset: PresetKey) => {
    const now = new Date();
    const t   = format(now, "yyyy-MM-dd");
    let   f   = t;

    if (preset === "week") {
      const d = new Date(now); d.setDate(now.getDate() - 6);
      f = format(d, "yyyy-MM-dd");
    } else if (preset === "month") {
      f = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
    } else if (preset === "quarter") {
      f = format(new Date(now.getFullYear(), now.getMonth() - 2, 1), "yyyy-MM-dd");
    }

    setDateFrom(f); setDateTo(t);
    push(f, t);
  };

  return (
    <div className="flex items-center gap-1.5 bg-muted/40 border border-border/60 px-2 py-1.5">
      {/* Preset chips */}
      {PRESETS.map(p => (
        <Button
          key={p.key}
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => applyPreset(p.key)}
          className="h-7 px-3 text-xs font-semibold hover:bg-background hover:shadow-sm transition-all"
        >
          {p.label}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Date range inputs */}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-7 text-xs w-[120px] border-0 bg-background shadow-sm px-2"
        />
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-7 text-xs w-[120px] border-0 bg-background shadow-sm px-2"
        />
        <Button
          size="sm"
          disabled={isPending || !dateFrom || !dateTo}
          onClick={applyCustom}
          className="h-7 px-3 text-xs gap-1.5"
        >
          <CalendarDays className="w-3 h-3" />
          Apply
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Print */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.print()}
        className="h-7 px-3 text-xs gap-1.5 hover:bg-background hover:shadow-sm transition-all"
      >
        <Printer className="w-3 h-3" />
        Print
      </Button>
    </div>
  );
}
