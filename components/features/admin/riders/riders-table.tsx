"use client";

import { useState, useTransition } from "react";
import { Bike, Wifi, WifiOff, Circle, Phone, Car, Loader2, Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "use-debounce";
import { updateRiderStatus, toggleRiderActive } from "@/server/actions/riders";
import { RiderDialogForm } from "./rider-dialog-form";
import { cn } from "@/lib/utils";

interface RidersTableProps {
  data: any[];
}

const riderStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  available: {
    label: "Available",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />,
  },
  busy: {
    label: "On Delivery",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />,
  },
  offline: {
    label: "Offline",
    className: "bg-slate-50 text-slate-500 border-slate-200",
    icon: <Circle className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />,
  },
};

export function RidersTable({ data }: RidersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filtered = data.filter(
    (r) =>
      r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.phone.includes(debouncedSearch)
  );

  const handleStatusChange = (riderId: string, status: "available" | "busy" | "offline") => {
    setUpdatingId(riderId);
    startTransition(async () => {
      const res = await updateRiderStatus(riderId, status);
      if (res.success) {
        toast.success("Rider status updated");
      } else {
        toast.error(res.error || "Failed to update status");
      }
      setUpdatingId(null);
    });
  };

  const handleToggleActive = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleRiderActive(userId, !currentStatus);
      if (res.success) {
        toast.success(`Rider ${!currentStatus ? "activated" : "deactivated"}`);
      } else {
        toast.error(res.error || "Failed to update rider");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto ml-auto">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {data.length} rider{data.length !== 1 ? "s" : ""}
          </p>
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Rider
          </Button>
        </div>
      </div>

      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border/60">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rider</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Bike className="w-10 h-10 opacity-20" />
                    <p className="font-semibold text-sm">No riders found</p>
                    <p className="text-xs opacity-70">
                      {data.length === 0
                        ? "No rider accounts exist yet. Create a user with the rider role."
                        : "No riders match your search."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rider) => {
                const isThisUpdating = updatingId === rider.riderId;
                const statusCfg = riderStatusConfig[rider.status ?? "offline"];
                return (
                  <TableRow
                    key={rider.id}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      isPending && "opacity-60"
                    )}
                  >
                    <TableCell>
                      <div className="font-semibold text-sm">{rider.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{rider.phone}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="WhatsApp Rider"
                          onClick={() => {
                            const phone = rider.phone.replace(/[^0-9]/g, "");
                            window.open(`https://wa.me/${phone}`, "_blank");
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {rider.email && (
                        <div className="text-xs text-muted-foreground/60 mt-0.5">{rider.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {rider.vehicleType || rider.vehiclePlate ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Car className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="capitalize">{rider.vehicleType ?? "N/A"}</span>
                          {rider.vehiclePlate && (
                            <Badge variant="outline" className="text-xs font-mono ml-1">
                              {rider.vehiclePlate}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rider.riderId ? (
                        <div className="flex items-center gap-2">
                          {isThisUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : null}
                          <Select
                            value={rider.status ?? "offline"}
                            onValueChange={(val) =>
                              handleStatusChange(rider.riderId, val as any)
                            }
                            disabled={isPending || !rider.isActive}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">
                                <div className="flex items-center gap-2">
                                  <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
                                  Available
                                </div>
                              </SelectItem>
                              <SelectItem value="busy">
                                <div className="flex items-center gap-2">
                                  <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                                  On Delivery
                                </div>
                              </SelectItem>
                              <SelectItem value="offline">
                                <div className="flex items-center gap-2">
                                  <Circle className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />
                                  Offline
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Badge variant="outline" className={statusCfg.className}>
                          <span className="flex items-center gap-1.5">
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rider.isActive ?? true}
                        onCheckedChange={() => handleToggleActive(rider.id, rider.isActive ?? true)}
                        disabled={isPending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RiderDialogForm open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
