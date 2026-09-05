"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2, ShieldAlert, ShieldCheck, Eye, EyeOff,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createStaff, updateStaffPermissions, type StaffMember } from "@/server/actions/staff";
import { DEFAULT_RBAC_MATRIX, type RBACDomain, type RBACMatrix } from "@/lib/auth/rbac";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const crudSchema = z.object({
  read:   z.boolean().default(false),
  create: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false),
});

const staffFormSchema = z.object({
  name:     z.string().min(2, "At least 2 characters"),
  phone:    z.string().min(10, "Enter a valid phone number"),
  email:    z.string().email("Invalid email").or(z.literal("")),
  age:      z.coerce.number().int().positive().optional().or(z.literal("")),
  password: z.string().optional(),
  role:     z.enum(["admin", "manager", "kitchen", "waiter", "rider"]),
  permissions: z.object({
    menu:      crudSchema,
    finance:   crudSchema,
    coupons:   crudSchema,
    inventory: crudSchema,
    staff:     crudSchema,
    orders:    crudSchema,
    whatsapp:  crudSchema,
  }).default(DEFAULT_RBAC_MATRIX),
  maxDiscountPercentage: z.coerce.number().min(0).max(100).default(0),
}).superRefine((d, ctx) => {
  // Password required when creating admin/manager
  if (!d.password && ["admin", "manager"].includes(d.role)) {
    // Only required for new staff (the parent will pass isEdit flag through closure)
    // We handle this per component instance below
  }
  if (["admin", "manager"].includes(d.role) && !d.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email required for Admin/Manager login" });
  }
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

// ─── Domain display config ────────────────────────────────────────────────────

const DOMAINS: { key: RBACDomain; label: string; desc: string }[] = [
  { key: "orders",    label: "Orders",    desc: "Live orders, status updates, cancellations" },
  { key: "menu",      label: "Menu",      desc: "Items, variants, add-ons, availability"     },
  { key: "finance",   label: "Finance",   desc: "Revenue analytics, daily register"          },
  { key: "coupons",   label: "Coupons",   desc: "Discount codes and promo management"        },
  { key: "inventory", label: "Inventory", desc: "Stock levels and restock transactions"      },
  { key: "staff",     label: "Staff",     desc: "User accounts and permission management"    },
  { key: "whatsapp",  label: "WhatsApp",  desc: "CRM outbox and broadcast messages"         },
];

const ACTIONS: { key: keyof z.infer<typeof crudSchema>; label: string; tip: string }[] = [
  { key: "read",   label: "View",   tip: "Read data / open the page" },
  { key: "create", label: "Create", tip: "Add new records"            },
  { key: "update", label: "Edit",   tip: "Modify existing records"    },
  { key: "delete", label: "Cancel", tip: "Archive, cancel, or delete" },
];

// ─── Preset permission bundles ────────────────────────────────────────────────

const PRESETS: { label: string; matrix: RBACMatrix }[] = [
  {
    label: "Floor Manager (Orders + Menu)",
    matrix: {
      ...DEFAULT_RBAC_MATRIX,
      orders:    { read: true,  create: true,  update: true,  delete: true  },
      menu:      { read: true,  create: false, update: true,  delete: false },
      coupons:   { read: true,  create: false, update: false, delete: false },
      finance:   { read: false, create: false, update: false, delete: false },
      inventory: { read: false, create: false, update: false, delete: false },
      staff:     { read: false, create: false, update: false, delete: false },
      whatsapp:  { read: false, create: false, update: false, delete: false },
    },
  },
  {
    label: "Finance Manager (Read-only)",
    matrix: {
      ...DEFAULT_RBAC_MATRIX,
      orders:    { read: true,  create: false, update: false, delete: false },
      finance:   { read: true,  create: false, update: false, delete: false },
      inventory: { read: true,  create: false, update: false, delete: false },
      menu:      { read: true,  create: false, update: false, delete: false },
      coupons:   { read: true,  create: false, update: false, delete: false },
      staff:     { read: false, create: false, update: false, delete: false },
      whatsapp:  { read: false, create: false, update: false, delete: false },
    },
  },
  {
    label: "Full Manager (All Access)",
    matrix: {
      menu:      { read: true, create: true, update: true, delete: true },
      finance:   { read: true, create: true, update: true, delete: true },
      coupons:   { read: true, create: true, update: true, delete: true },
      inventory: { read: true, create: true, update: true, delete: true },
      staff:     { read: true, create: true, update: true, delete: true },
      orders:    { read: true, create: true, update: true, delete: true },
      whatsapp:  { read: true, create: true, update: true, delete: true },
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffDialog({
  children,
  staff,
}: {
  children: React.ReactNode;
  staff?: StaffMember;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen]               = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showPerms, setShowPerms]         = useState(true);
  const isEdit = !!staff;

  const form = useForm<any>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name:                 "",
      phone:                "",
      email:                "",
      age:                  "" as any,
      password:             "",
      role:                 "waiter",
      permissions:          DEFAULT_RBAC_MATRIX,
      maxDiscountPercentage: 0,
    },
  });

  const role = form.watch("role");

  // Populate form when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    if (staff) {
      const rawPerms = staff.permissions?.permissions;
      let parsedPerms: RBACMatrix = DEFAULT_RBAC_MATRIX;
      if (rawPerms && typeof rawPerms === "object") {
        // Merge with defaults so any missing keys become false
        parsedPerms = {
          menu:      { ...DEFAULT_RBAC_MATRIX.menu,      ...((rawPerms as any).menu      ?? {}) },
          finance:   { ...DEFAULT_RBAC_MATRIX.finance,   ...((rawPerms as any).finance   ?? {}) },
          coupons:   { ...DEFAULT_RBAC_MATRIX.coupons,   ...((rawPerms as any).coupons   ?? {}) },
          inventory: { ...DEFAULT_RBAC_MATRIX.inventory, ...((rawPerms as any).inventory ?? {}) },
          staff:     { ...DEFAULT_RBAC_MATRIX.staff,     ...((rawPerms as any).staff     ?? {}) },
          orders:    { ...DEFAULT_RBAC_MATRIX.orders,    ...((rawPerms as any).orders    ?? {}) },
          whatsapp:  { ...DEFAULT_RBAC_MATRIX.whatsapp,  ...((rawPerms as any).whatsapp  ?? {}) },
        };
      }
      form.reset({
        name:                  staff.name,
        phone:                 staff.phone,
        email:                 staff.email ?? "",
        age:                   staff.age ?? ("" as any),
        password:              "",
        role:                  staff.role,
        permissions:           parsedPerms,
        maxDiscountPercentage: staff.permissions?.maxDiscountPercentage ?? 0,
      });
    } else {
      form.reset({
        name: "", phone: "", email: "", age: "" as any,
        password: "", role: "waiter",
        permissions: DEFAULT_RBAC_MATRIX,
        maxDiscountPercentage: 0,
      });
    }
    setShowPassword(false);
  }, [isOpen, staff, form]);

  // Apply a preset bundle
  const applyPreset = (preset: typeof PRESETS[number]) => {
    form.setValue("permissions", preset.matrix, { shouldDirty: true });
    toast.success(`Applied: ${preset.label}`);
  };

  // Toggle entire row (all 4 actions for a domain)
  const toggleDomainAll = (domain: RBACDomain, allOn: boolean) => {
    const next = { read: !allOn, create: !allOn, update: !allOn, delete: !allOn };
    form.setValue(`permissions.${domain}`, next, { shouldDirty: true });
  };

  const onSubmit = async (data: StaffFormValues) => {
    try {
      const payload = {
        name:     data.name,
        phone:    data.phone,
        email:    data.email || undefined,
        age:      data.age === "" ? undefined : Number(data.age),
        password: data.password || undefined,
        role:     data.role,
        permissions:           data.role === "manager" ? data.permissions : undefined,
        maxDiscountPercentage: data.role === "manager" ? data.maxDiscountPercentage : undefined,
      };

      const res = isEdit
        ? await updateStaffPermissions(staff!.id, payload as any)
        : await createStaff(payload as any);

      if (!res.success) throw new Error((res as any).error);

      toast.success(isEdit ? "Staff member updated" : "Staff member created");
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff member");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="w-[95vw] max-w-4xl p-0 flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {role === "admin" ? (
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            ) : role === "manager" ? (
              <ShieldCheck className="w-5 h-5 text-purple-500" />
            ) : null}
            <DialogTitle className="text-xl font-black">
              {isEdit ? `Edit — ${staff?.name}` : "Add Staff Member"}
            </DialogTitle>
          </div>
          {role === "admin" && (
            <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Admin role bypasses all permission checks — grant only to trusted individuals.
            </p>
          )}
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <Form {...form}>
            <form id="staff-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Row 1: Name + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="Ali Khan" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="03XXXXXXXXX"
                        {...field}
                        onChange={e => field.onChange(e.target.value.replace(/[^0-9+]/g, ""))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 2: Email + Age */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email
                      {["admin","manager"].includes(role) && <span className="text-destructive ml-1">*</span>}
                      <span className="text-muted-foreground ml-1 font-normal text-[10px]">(login ID)</span>
                    </FormLabel>
                    <FormControl><Input type="email" placeholder="ali@classycrave.pk" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age <span className="text-muted-foreground font-normal text-[10px]">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number" placeholder="25" min={16} max={80}
                        {...field}
                        value={field.value === "" ? "" : field.value}
                        onChange={e => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 3: Role + Password */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Admin (Full Access)
                          </span>
                        </SelectItem>
                        <SelectItem value="manager">
                          <span className="flex items-center gap-1.5 text-purple-600 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Manager (Custom)
                          </span>
                        </SelectItem>
                        <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                        <SelectItem value="waiter">Waiter / Floor</SelectItem>
                        <SelectItem value="rider">Delivery Rider</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEdit ? "New Password" : "Password"}
                      {!isEdit && ["admin","manager"].includes(role) && <span className="text-destructive ml-1">*</span>}
                      {isEdit && <span className="text-muted-foreground ml-1 font-normal text-[10px]">(leave blank to keep)</span>}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(v => !v)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* ── Manager permissions block ── */}
              {role === "manager" && (
                <div className="border bg-muted/20 overflow-hidden">
                  {/* Collapsible header */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                    onClick={() => setShowPerms(v => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span className="font-bold text-sm">Manager Permissions</span>
                      <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-300 bg-purple-50">
                        {Object.values(form.watch("permissions") ?? {}).reduce(
                          (count: number, domain: unknown) =>
                            count + Object.values(domain as Record<string,boolean>).filter(Boolean).length,
                          0
                        ) as number}/28 granted
                      </Badge>
                    </div>
                    {showPerms ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {showPerms && (
                    <div className="border-t px-4 py-4 space-y-4">
                      {/* Quick presets */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Presets:</span>
                        {PRESETS.map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="text-[10px] font-bold px-2 py-1 border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary transition-colors"
                          >
                            {p.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => form.setValue("permissions", DEFAULT_RBAC_MATRIX, { shouldDirty: true })}
                          className="text-[10px] font-bold px-2 py-1 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>

                      {/* Permission grid */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left font-bold py-2 pr-4 text-xs text-muted-foreground uppercase tracking-wider w-36">Domain</th>
                              {ACTIONS.map(a => (
                                <th key={a.key} className="text-center font-bold py-2 px-3 text-xs text-muted-foreground uppercase tracking-wider" title={a.tip}>
                                  {a.label}
                                </th>
                              ))}
                              <th className="text-center font-bold py-2 px-2 text-xs text-muted-foreground uppercase tracking-wider">All</th>
                            </tr>
                          </thead>
                          <tbody>
                            {DOMAINS.map(d => {
                              const currentDomain = form.watch(`permissions.${d.key}`);
                              const allOn = currentDomain
                                ? Object.values(currentDomain).every(Boolean)
                                : false;

                              return (
                                <tr key={d.key} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                  <td className="py-2.5 pr-4">
                                    <div>
                                      <p className="font-semibold text-sm">{d.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                                    </div>
                                  </td>
                                  {ACTIONS.map(a => (
                                    <td key={a.key} className="text-center px-3 py-2.5">
                                      <FormField
                                        control={form.control}
                                        name={`permissions.${d.key}.${a.key}` as any}
                                        render={({ field }) => (
                                          <Checkbox
                                            checked={field.value ?? false}
                                            onCheckedChange={field.onChange}
                                            aria-label={`${d.label} ${a.label}`}
                                          />
                                        )}
                                      />
                                    </td>
                                  ))}
                                  {/* Toggle all in row */}
                                  <td className="text-center px-2 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleDomainAll(d.key, allOn)}
                                      className={cn(
                                        "w-5 h-5 border text-[9px] font-black transition-all",
                                        allOn
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                                      )}
                                    >
                                      {allOn ? "−" : "+"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Discount cap */}
                      <Separator />
                      <div className="flex items-end gap-4">
                        <FormField control={form.control} name="maxDiscountPercentage" render={({ field }) => (
                          <FormItem className="w-40">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider">Max POS Discount</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" min={0} max={100}
                                  {...field}
                                  onChange={e => field.onChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                  className="h-9 w-20 text-center font-bold"
                                />
                                <span className="text-sm font-black text-muted-foreground">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <p className="text-[10px] text-muted-foreground pb-2.5">
                          Maximum discount this manager can apply in the POS dialog.
                          Set to 0 to disable discounts entirely.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* ── Sticky footer ── */}
        <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex justify-between items-center gap-3">
          <div className="text-[10px] text-muted-foreground">
            {isEdit && "Session is instantly invalidated on save — user must re-login."}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="staff-form"
              disabled={form.formState.isSubmitting}
              className={cn(role === "admin" && "bg-rose-600 hover:bg-rose-700")}
            >
              {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.formState.isSubmitting
                ? "Saving..."
                : isEdit ? "Save Changes" : "Create Staff"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
