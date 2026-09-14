"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceLoading() {
  return (
    <div className="h-full flex flex-col p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      {/* Top KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border p-5 space-y-4 rounded-none">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-[140px]" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton (Table / Charts) */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
