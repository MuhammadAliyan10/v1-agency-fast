"use client";

import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export default function FinanceLoading() {
  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <PageHeader heading="Finance Dashboard" description="Loading financial insights..." />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
