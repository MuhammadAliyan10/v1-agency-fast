"use client";

import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

export function PrintButton() {
  return (
    <Button
      variant="default"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 h-auto rounded-none shadow-sm"
    >
      <Receipt className="w-3.5 h-3.5" />
      Print Slip
    </Button>
  );
}
