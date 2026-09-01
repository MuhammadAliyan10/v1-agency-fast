// components/features/admin/orders/print-invoice-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintInvoiceButton() {
  return (
    <Button
      variant="default"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="w-4 h-4" /> Print Invoice
    </Button>
  );
}
