"use client";

import { useState, useTransition } from "react";
import { Users, Phone, Mail, Shield, ShieldOff, Loader2, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDebounce } from "use-debounce";

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
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleStaffStatus } from "@/server/actions/staff";
import { StaffDialogForm } from "./staff-dialog-form";
import { cn } from "@/lib/utils";

interface StaffTableProps {
  data: any[];
  currentUserId: string;
}

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-primary/10 text-primary border-primary/30" },
  manager: { label: "Manager", className: "bg-blue-50 text-blue-700 border-blue-200" },
  kitchen: { label: "Kitchen", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

export function StaffTable({ data, currentUserId }: StaffTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filtered = data.filter(
    (s) =>
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.phone.includes(debouncedSearch)
  );

  const handleToggle = (userId: string, currentStatus: boolean) => {
    if (userId === currentUserId) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    startTransition(async () => {
      const res = await toggleStaffStatus(userId, !currentStatus);
      if (res.success) {
        toast.success(`Staff member ${!currentStatus ? "activated" : "deactivated"}`);
      } else {
        toast.error(res.error || "Failed to update staff member");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto ml-auto">
          <p className="text-sm text-muted-foreground">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </p>
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border/60">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</TableHead>
              <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Users className="w-10 h-10 opacity-20" />
                    <p className="font-semibold text-sm">No staff found</p>
                    <p className="text-xs opacity-70">
                      {data.length === 0
                        ? "No admin or manager accounts exist yet."
                        : "No staff match your search."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => {
                const isSelf = member.id === currentUserId;
                const roleCfg = roleConfig[member.role] ?? { label: member.role, className: "" };
                return (
                  <TableRow
                    key={member.id}
                    className={cn("border-b border-border/60 transition-colors", isPending && "opacity-60")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            {member.name}
                            {isSelf && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            {member.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {member.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleCfg.className}>
                        {roleCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.createdAt ? format(new Date(member.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Switch
                                checked={member.isActive ?? true}
                                onCheckedChange={() => handleToggle(member.id, member.isActive ?? true)}
                                disabled={isPending || isSelf}
                              />
                            </div>
                          </TooltipTrigger>
                          {isSelf && (
                            <TooltipContent>
                              <p>You cannot deactivate your own account</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <StaffDialogForm open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
