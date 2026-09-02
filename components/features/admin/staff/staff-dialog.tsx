"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStaff, updateStaffPermissions, type StaffMember } from "@/server/actions/staff";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEFAULT_RBAC_MATRIX, type RBACMatrix, type RBACDomain } from "@/lib/auth/rbac";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const rbacMatrixSchema = z.record(
  z.string(),
  z.object({
    read: z.boolean(),
    create: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  })
);

export function StaffDialog({
  children,
  staff
}: {
  children: React.ReactNode;
  staff?: StaffMember;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const staffSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email("Invalid email").or(z.literal("")),
    age: z.number().nullable().or(z.literal("")),
    password: z.string().optional(),
    role: z.enum(["admin", "manager", "kitchen", "waiter", "rider"]),
    permissions: rbacMatrixSchema.optional(),
    maxDiscountPercentage: z.number().min(0).max(100).default(0),
  }).superRefine((data, ctx) => {
    if (!staff && ["admin", "manager"].includes(data.role) && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required for admins and managers",
        path: ["password"]
      });
    }
    if (["admin", "manager"].includes(data.role) && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for admins and managers",
        path: ["email"]
      });
    }
  });

  type StaffFormValues = z.infer<typeof staffSchema>;

  const form = useForm<any>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      age: "",
      password: "",
      role: "waiter",
      permissions: DEFAULT_RBAC_MATRIX,
      maxDiscountPercentage: 0,
    },
  });

  const domainLabels: Record<RBACDomain, string> = {
    menu: "Menu",
    finance: "Finance",
    coupons: "Coupons",
    inventory: "Inventory",
    staff: "Staff",
    orders: "Orders",
    whatsapp: "WhatsApp",
  };

  useEffect(() => {
    if (isOpen && staff) {
      form.reset({
        name: staff.name,
        phone: staff.phone,
        email: staff.email || "",
        age: staff.age || "",
        password: "", // never populate password
        role: staff.role as any,
        permissions: (staff.permissions?.permissions as any) || DEFAULT_RBAC_MATRIX,
        maxDiscountPercentage: staff.permissions?.maxDiscountPercentage || 0,
      });
    } else if (isOpen && !staff) {
      form.reset({
        name: "",
        phone: "",
        email: "",
        age: "",
        password: "",
        role: "waiter",
        permissions: DEFAULT_RBAC_MATRIX,
        maxDiscountPercentage: 0,
      });
    }
  }, [isOpen, staff, form]);

  const role = form.watch("role");

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        age: data.age === "" ? undefined : data.age,
        password: data.password || undefined,
        role: data.role,
        permissions: data.role === "manager" ? {
          permissions: data.permissions,
          maxDiscountPercentage: data.maxDiscountPercentage,
        } : undefined,
      };

      let res;
      if (staff) {
        res = await updateStaffPermissions(staff.id, payload as any);
      } else {
        res = await createStaff(payload as any);
      }

      if (!res.success) {
        throw new Error(res.error);
      }

      toast.success(staff ? "Staff updated successfully" : "Staff created successfully");
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff member");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Ali Khan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="03XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Login ID)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ali@classycrave.pk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="manager">Manager (Custom Access)</SelectItem>
                        <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                        <SelectItem value="waiter">Waiter / Floor Staff</SelectItem>
                        <SelectItem value="rider">Delivery Rider</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{staff ? "New Password (Optional)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {role === "manager" && (
              <div className="mt-6 space-y-4 border p-4 bg-muted/20">
                <h4 className="font-bold text-sm">Manager Permissions</h4>
                <div className="grid grid-cols-5 gap-2 border-b pb-2 mb-2 text-xs font-semibold text-muted-foreground">
                  <div>Domain</div>
                  <div className="text-center">Read</div>
                  <div className="text-center">Create</div>
                  <div className="text-center">Update</div>
                  <div className="text-center">Delete (Archive/Cancel)</div>
                </div>
                <div className="space-y-3">
                  {Object.keys(domainLabels).map((domain) => {
                    const key = domain as RBACDomain;
                    return (
                      <div key={key} className="grid grid-cols-5 gap-2 items-center text-sm">
                        <div className="font-medium">{domainLabels[key]}</div>
                        {["read", "create", "update", "delete"].map((action) => (
                          <div key={action} className="flex justify-center">
                            <FormField
                              control={form.control}
                              name={`permissions.${key}.${action}` as any}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <h4 className="font-bold text-sm mt-6 mb-2">Discount Limits</h4>
                <div className="space-y-2 max-w-[200px]">
                  <FormField
                    control={form.control}
                    name="maxDiscountPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Discount (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <p className="text-[10px] text-muted-foreground">Limit for manual POS discounts.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {form.formState.isSubmitting ? "Processing..." : (staff ? "Save Changes" : "Create Staff")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
