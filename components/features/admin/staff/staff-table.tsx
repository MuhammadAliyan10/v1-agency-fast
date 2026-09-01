"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, ShieldAlert } from "lucide-react";
import { toggleStaffStatus, type StaffMember } from "@/server/actions/staff";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { StaffDialog } from "./staff-dialog";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  waiter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  rider: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function StaffTable({ data }: { data: StaffMember[] }) {
  const router = useRouter();

  const handleToggle = async (userId: string, currentStatus: boolean | null) => {
    const newStatus = !(currentStatus ?? false);
    const toastId = toast.loading(newStatus ? "Activating user..." : "Revoking access (instant)...");
    
    const res = await toggleStaffStatus(userId, newStatus);
    
    if (res.success) {
      toast.success(newStatus ? "User activated" : "Access instantly revoked", { id: toastId });
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update status", { id: toastId });
    }
  };

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Status (Instant Revoke)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((staff) => (
            <TableRow key={staff.id} className={staff.isActive ? "" : "opacity-60 bg-muted/20"}>
              <TableCell className="font-medium">
                {staff.name}
                {staff.role === "admin" && <ShieldAlert className="inline w-3 h-3 ml-2 text-red-500" />}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={ROLE_COLORS[staff.role] || "bg-zinc-100 text-zinc-800"}>
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span>{staff.phone}</span>
                  {staff.email && <span className="text-xs text-muted-foreground">{staff.email}</span>}
                </div>
              </TableCell>
              <TableCell>
                {staff.role === "admin" ? (
                  <span className="text-xs font-semibold text-red-500">Full Access</span>
                ) : staff.role === "manager" && staff.permissions ? (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {Object.entries(staff.permissions)
                      .filter(([k, v]) => v === true && k.startsWith("can"))
                      .map(([k]) => (
                        <Badge key={k} variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {k.replace("can", "")}
                        </Badge>
                      ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Portal Restricted</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={staff.isActive ?? false} 
                    onCheckedChange={() => handleToggle(staff.id, staff.isActive)}
                    disabled={staff.role === "admin"} // Prevent locking out the root admin easily
                  />
                  <span className="text-xs font-medium">
                    {staff.isActive ? "Active" : "Revoked"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <StaffDialog staff={staff}>
                  <Button variant="ghost" size="icon">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </StaffDialog>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No staff members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
