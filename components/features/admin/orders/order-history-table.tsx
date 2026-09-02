"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Search, History, Download } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrderHistoryTableProps {
  orders: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:          { label: "Pending",         className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" },
  approved:         { label: "Approved",        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  preparing:        { label: "Preparing",       className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400" },
  out_for_delivery: { label: "Out for Delivery",className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400" },
  delivered:        { label: "Delivered",       className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" },
  cancelled:        { label: "Cancelled",       className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
  rejected:         { label: "Rejected",        className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
  delayed:          { label: "Delayed",         className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400" },
  ready_for_pickup: { label: "Ready for Pickup",className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400" },
};

export function OrderHistoryTable({ orders, totalCount, totalPages, currentPage }: OrderHistoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    const currentStatus = searchParams.get("status") || "all";
    const currentFrom = searchParams.get("from") || "";
    const currentTo = searchParams.get("to") || "";
    
    if (
      debouncedSearch === currentSearch && 
      statusFilter === currentStatus &&
      dateFrom === currentFrom &&
      dateTo === currentTo
    ) return;

    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");

    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    else params.delete("status");

    if (dateFrom) params.set("from", dateFrom);
    else params.delete("from");

    if (dateTo) params.set("to", dateTo);
    else params.delete("to");

    params.set("page", "1"); 

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const exportToCSV = () => {
    const selectedData = orders.filter(o => selectedOrders.includes(o.id));
    if (selectedData.length === 0) return;

    const headers = ["Date", "Time", "Order ID", "Type", "Customer Name", "Customer Phone", "Status", "Payment", "Total"];
    const rows = selectedData.map(o => [
      format(new Date(o.createdAt), "yyyy-MM-dd"),
      format(new Date(o.createdAt), "HH:mm:ss"),
      o.id,
      o.orderType,
      o.customerName || "Walk-in",
      o.customerPhone || "",
      o.status,
      o.paymentStatus,
      o.totalAmount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(item => `"${String(item || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, name, or phone..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 w-[130px] text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-muted-foreground text-xs font-semibold">to</span>
            <Input
              type="date"
              className="h-9 w-[130px] text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {selectedOrders.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-semibold text-primary">
            {selectedOrders.length} order(s) selected
          </span>
          <Button size="sm" onClick={exportToCSV} className="gap-2 h-8">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border/80 bg-card overflow-hidden shadow-sm mt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border/60">
                <TableHead className="w-[40px] pl-4">
                  <Checkbox 
                    checked={orders.length > 0 && selectedOrders.length === orders.length}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedOrders(orders.map(o => o.id));
                      else setSelectedOrders([]);
                    }}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & Time</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order ID</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type & Payment</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <History className="w-10 h-10 text-muted-foreground/30" />
                      {searchTerm || statusFilter !== "all" ? (
                        <>
                          <p className="font-semibold text-sm">No orders match your search</p>
                          <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
                          <Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>Clear Filters</Button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">No order history available</p>
                          <p className="text-xs text-muted-foreground/70">Orders placed will appear here.</p>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const config = statusConfig[order.status] || { label: order.status, className: "" };
                  return (
                    <TableRow 
                      key={order.id} 
                      className={cn(
                        "border-b border-border/60 transition-colors hover:bg-muted/30",
                        isPending && "opacity-50",
                        selectedOrders.includes(order.id) && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <TableCell className="pl-4">
                        <Checkbox 
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedOrders([...selectedOrders, order.id]);
                            else setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <div className="text-sm font-medium">{format(new Date(order.createdAt), "MMM d, yyyy")}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "h:mm a")}</div>
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <span className="font-mono text-sm font-bold text-foreground/80">#{order.id.slice(-6).toUpperCase()}</span>
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <div className="font-semibold text-sm">{order.customerName || "Walk-in"}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                              {order.orderType?.replace("_", " ")}
                            </Badge>
                            <Badge className={cn(
                              "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border-0 shadow-sm",
                              order.paymentStatus === "paid" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"
                            )}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Taken By: {order.source === 'admin' ? 'Admin/Manager' : order.source}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        <Badge variant="outline" className={config.className}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        Rs. {order.totalAmount?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((currentPage - 1) * 10) + 1}–{Math.min(currentPage * 10, totalCount)} of {totalCount} orders
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1 || isPending} onClick={() => handlePageChange(currentPage - 1)}>Previous</Button>
            <span className="text-xs font-medium text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages || isPending} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
