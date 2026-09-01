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

export function StaffDialog({ 
  children, 
  staff 
}: { 
  children: React.ReactNode; 
  staff?: StaffMember;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "waiter" as "admin" | "manager" | "kitchen" | "waiter" | "rider",
  });

  const [permissions, setPermissions] = useState({
    canManageMenu: false,
    canViewFinance: false,
    canManageCoupons: false,
    canViewInventory: false,
    canBroadcastWhatsapp: false,
    canManageStaff: false,
    maxDiscountPercentage: 0,
  });

  useEffect(() => {
    if (isOpen && staff) {
      setFormData({
        name: staff.name,
        phone: staff.phone,
        email: staff.email || "",
        password: "", // never populate password
        role: staff.role,
      });
      if (staff.permissions) {
        setPermissions({
          canManageMenu: staff.permissions.canManageMenu,
          canViewFinance: staff.permissions.canViewFinance,
          canManageCoupons: staff.permissions.canManageCoupons,
          canViewInventory: staff.permissions.canViewInventory,
          canBroadcastWhatsapp: staff.permissions.canBroadcastWhatsapp,
          canManageStaff: staff.permissions.canManageStaff,
          maxDiscountPercentage: staff.permissions.maxDiscountPercentage || 0,
        });
      }
    } else if (isOpen && !staff) {
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "waiter",
      });
      setPermissions({
        canManageMenu: false,
        canViewFinance: false,
        canManageCoupons: false,
        canViewInventory: false,
        canBroadcastWhatsapp: false,
        canManageStaff: false,
        maxDiscountPercentage: 0,
      });
    }
  }, [isOpen, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        permissions: formData.role === "manager" ? permissions : undefined,
      };

      let res;
      if (staff) {
        res = await updateStaffPermissions(staff.id, payload);
      } else {
        if (!formData.password) {
          throw new Error("Password is required for new staff.");
        }
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ali Khan"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                required 
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="03XXXXXXXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="ali@classycrave.pk"
              />
            </div>
            <div className="space-y-2">
              <Label>{staff ? "New Password (Optional)" : "Password"}</Label>
              <Input 
                type="password"
                required={!staff}
                value={formData.password} 
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="********"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(val: any) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                <SelectItem value="manager">Manager (Custom Access)</SelectItem>
                <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                <SelectItem value="waiter">Waiter / Floor Staff</SelectItem>
                <SelectItem value="rider">Delivery Rider</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === "manager" && (
            <div className="mt-6 space-y-4 border rounded-lg p-4 bg-muted/20">
              <h4 className="font-bold text-sm">Manager Permissions</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(permissions).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={key} 
                      checked={(permissions as any)[key]} 
                      onCheckedChange={(checked) => setPermissions({ ...permissions, [key]: checked })}
                    />
                    <label
                      htmlFor={key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
              <h4 className="font-bold text-sm mt-6 mb-2">Discount Limits</h4>
              <div className="space-y-2 max-w-[200px]">
                <Label>Max Discount (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={permissions.maxDiscountPercentage}
                  onChange={(e) => setPermissions({ ...permissions, maxDiscountPercentage: parseInt(e.target.value) || 0 })}
                />
                <p className="text-[10px] text-muted-foreground">Limit for manual POS discounts.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {staff ? "Save Changes" : "Create Staff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
