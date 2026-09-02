import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28 ml-auto" />
      </div>
      <div className="border border-border/80 overflow-hidden">
        <div className="bg-muted/20 p-4 border-b border-border/60">
          <div className="flex gap-6">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 p-4 border-b border-border/40 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-5 w-24 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TablePageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <TableSkeleton />
    </div>
  );
}
