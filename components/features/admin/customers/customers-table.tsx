"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, User, UserX, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleCustomerStatus } from "@/server/actions/customers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CustomerData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  totalOrders: number;
  lifetimeSpend: number;
}

export function CustomersTable({ data }: { data: CustomerData[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, setIsPending] = useState<string | null>(null);
  const router = useRouter();

  const filteredData = data.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  });

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setIsPending(userId);
    try {
      const res = await toggleCustomerStatus(userId, !currentStatus);
      if (res.success) {
        toast.success(`Customer account ${!currentStatus ? 'activated' : 'suspended'}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update customer status");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers by name, email, or phone..."
            className="pl-9 bg-card border-border/50 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Joined</TableHead>
              <TableHead className="font-semibold text-center">Orders</TableHead>
              <TableHead className="font-semibold text-right">Lifetime Spend</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((customer) => (
                <TableRow key={customer.id} className="border-border/50 hover:bg-muted/20">
                  <TableCell>
                    <div className="font-medium text-foreground">{customer.name || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">ID: {customer.id.substring(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.email}</div>
                    <div className="text-xs text-muted-foreground">{customer.phone || "No phone"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.createdAt ? format(new Date(customer.createdAt), "MMM d, yyyy") : "Unknown"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-semibold">
                      {customer.totalOrders}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    Rs. {customer.lifetimeSpend.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={customer.isActive ? "outline" : "destructive"} className={customer.isActive ? "border-green-200 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" : ""}>
                      {customer.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(customer.id, customer.isActive ?? false)}
                      disabled={isPending === customer.id}
                      className={customer.isActive ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-green-600 hover:text-green-600 hover:bg-green-50"}
                    >
                      {isPending === customer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : customer.isActive ? (
                        <>
                          <UserX className="w-4 h-4 mr-2" /> Suspend
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 mr-2" /> Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
