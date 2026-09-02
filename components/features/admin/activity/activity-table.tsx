"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { ActivityLogEntry } from "@/server/actions/activity";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const ACTION_COLORS: Record<string, string> = {
  ORDER_CREATED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  STAFF_UPDATED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  MENU_UPDATED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  STATUS_CHANGED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export function ActivityTable({ 
  data, 
  pagination 
}: { 
  data: ActivityLogEntry[]; 
  pagination: { total: number; pageCount: number; currentPage: number; perPage: number; } 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss") : "Unknown"}
                </TableCell>
                <TableCell className="font-medium">
                  {log.userName || "System / Guest"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={ACTION_COLORS[log.action] || "bg-zinc-100 text-zinc-800"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">
                  {log.targetType} {log.targetId && <span className="opacity-50">#{log.targetId.slice(-6)}</span>}
                </TableCell>
                <TableCell className="text-sm max-w-[300px] truncate" title={log.metadata ? JSON.stringify(log.metadata) : ""}>
                  {log.metadata ? JSON.stringify(log.metadata) : "-"}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No activity logs found.
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
              disabled={pagination.currentPage <= 1}
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
              disabled={pagination.currentPage >= pagination.pageCount}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
