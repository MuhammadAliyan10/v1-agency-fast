"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { OutboxMessage } from "@/server/actions/outbox";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { retryMessage } from "@/server/actions/outbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  sending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  retry: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
};

export function OutboxTable({ 
  data, 
  pagination 
}: { 
  data: OutboxMessage[]; 
  pagination: { total: number; pageCount: number; currentPage: number; perPage: number; } 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleRetry = (id: string, element: HTMLElement) => {
    // Optimistic UI Update: We change the DOM locally while the server action runs.
    const row = element.closest('tr');
    if (row) {
      const badge = row.querySelector('.status-badge');
      if (badge) {
        badge.className = `inline-flex items-center  border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 status-badge ${STATUS_COLORS.pending}`;
        badge.textContent = "pending";
      }
      const btn = row.querySelector('.retry-btn') as HTMLButtonElement;
      if (btn) btn.disabled = true;
    }

    startTransition(async () => {
      const res = await retryMessage(id);
      if (res.success) {
        toast.success("Message queued for retry.");
      } else {
        toast.error("Failed to queue retry.");
        router.refresh(); // revert optimistic UI
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Created At</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, HH:mm") : "Unknown"}
                </TableCell>
                <TableCell className="font-medium font-mono text-xs">
                  {msg.phone}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("status-badge", STATUS_COLORS[msg.status] || "bg-zinc-100 text-zinc-800")}>
                    {msg.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {msg.status === "failed" || msg.status === "retry" ? (
                    <span className="flex items-center text-red-500/80" title={msg.lastError || "Unknown error"}>
                      <AlertCircle className="w-3 h-3 mr-1" /> {msg.lastError || "Failed"}
                      {msg.nextRetryAt && ` (Retry: ${format(new Date(msg.nextRetryAt), "HH:mm")})`}
                    </span>
                  ) : (
                    <span className="opacity-50">Attempts: {msg.attempts}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {msg.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs retry-btn"
                      onClick={(e) => handleRetry(msg.id, e.currentTarget)}
                      disabled={isPending}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No messages in outbox.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.perPage) + 1} to {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of {pagination.total} entries
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || isPending}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {pagination.currentPage} of {pagination.pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.pageCount || isPending}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
