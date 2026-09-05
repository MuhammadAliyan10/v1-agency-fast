"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Edit2, MoreVertical } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleStaffStatus, type StaffMember } from "@/server/actions/staff";
import { StaffDialog } from "./staff-dialog";
import type { RBACDomain } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

// ─── Role display ─────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; cls: string }> = {
  admin:   { label: "Admin",   cls: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300"     },
  manager: { label: "Manager", cls: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300" },
  kitchen: { label: "Kitchen", cls: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300" },
  waiter:  { label: "Waiter",  cls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"     },
  rider:   { label: "Rider",   cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

// ─── Permission summary cell ──────────────────────────────────────────────────
// Reads the nested RBAC matrix and renders compact domain+action badges

function PermissionSummary({ staff }: { staff: StaffMember }) {
  if (staff.role === "admin") {
    return (
      <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> Full Access
      </span>
    );
  }

  if (staff.role !== "manager" || !staff.permissions?.permissions) {
    return <span className="text-xs text-muted-foreground">Portal only</span>;
  }

  const matrix = staff.permissions.permissions as Record<string, Record<string, boolean>>;
  const domains: RBACDomain[] = ["orders", "menu", "finance", "coupons", "inventory", "staff", "whatsapp"];

  const granted = domains.filter(d => {
    const domain = matrix[d];
    return domain && Object.values(domain).some(Boolean);
  });

  if (granted.length === 0) {
    return <span className="text-xs text-muted-foreground italic">No permissions set</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 max-w-[220px]">
      {granted.map(d => {
        const domain = matrix[d] as Record<string, boolean>;
        const actions = Object.entries(domain)
          .filter(([, v]) => v)
          .map(([k]) => k[0].toUpperCase()) // R / C / U / D
          .join("");
        return (
          <span
            key={d}
            title={`${d}: ${Object.entries(domain).filter(([,v])=>v).map(([k])=>k).join(", ")}`}
            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
          >
            {d.charAt(0).toUpperCase() + d.slice(1)} · {actions}
          </span>
        );
      })}
      {staff.permissions.maxDiscountPercentage > 0 && (
        <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
          Disc {staff.permissions.maxDiscountPercentage}%
        </span>
      )}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function StaffTable({ data, isAdmin }: { data: StaffMember[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const handleToggle = async (staff: StaffMember) => {
    const newStatus = !(staff.isActive ?? false);
    setPending(staff.id);
    const toastId = toast.loading(newStatus ? "Activating..." : "Revoking access...");
    const res = await toggleStaffStatus(staff.id, newStatus);
    setPending(null);

    if (res.success) {
      toast.success(
        newStatus ? `${staff.name} reactivated` : `${staff.name}'s access instantly revoked`,
        { id: toastId }
      );
      router.refresh();
    } else {
      toast.error(res.error || "Failed", { id: toastId });
    }
  };

  return (
    <div className="border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[90px]">Role</TableHead>
            <TableHead className="w-[200px]">Contact</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            {isAdmin && <TableHead className="text-right w-[60px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                No staff members found.
              </TableCell>
            </TableRow>
          )}
          {data.map(staff => {
            const meta = ROLE_META[staff.role] ?? { label: staff.role, cls: "" };
            const isLocked = pending === staff.id;

            return (
              <TableRow
                key={staff.id}
                className={cn(
                  "transition-colors",
                  !staff.isActive && "opacity-50 bg-muted/10"
                )}
              >
                {/* Name */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-bold text-sm leading-tight">{staff.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{staff.phone}</p>
                    </div>
                    {staff.role === "admin" && (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-label="Admin — full access" />
                    )}
                    {staff.role === "manager" && (
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" aria-label="Manager — custom permissions" />
                    )}
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider border", meta.cls)}>
                    {meta.label}
                  </Badge>
                </TableCell>

                {/* Contact */}
                <TableCell>
                  <div className="text-xs space-y-0.5">
                    {staff.email && (
                      <p className="text-muted-foreground truncate max-w-[180px]">{staff.email}</p>
                    )}
                    {staff.age && (
                      <p className="text-muted-foreground">Age: {staff.age}</p>
                    )}
                  </div>
                </TableCell>

                {/* Permissions */}
                <TableCell>
                  <PermissionSummary staff={staff} />
                </TableCell>

                {/* Status toggle */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={staff.isActive ?? false}
                      onCheckedChange={() => handleToggle(staff)}
                      disabled={isLocked || (staff.role === "admin" && !isAdmin)}
                      aria-label={`Toggle ${staff.name}`}
                    />
                    <span className={cn(
                      "text-xs font-bold",
                      staff.isActive ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {staff.isActive ? "Active" : "Revoked"}
                    </span>
                  </div>
                </TableCell>

                {/* Edit action (admin only) */}
                {isAdmin && (
                  <TableCell className="text-right">
                    <StaffDialog staff={staff}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${staff.name}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </StaffDialog>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
