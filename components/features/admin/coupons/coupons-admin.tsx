"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Ticket, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { createCoupon, updateCoupon, deleteCoupon } from "@/server/actions/coupons";

interface Coupon {
  id: string; code: string; description?: string | null;
  discountType: "flat" | "percent"; discountValue: number;
  applicableItemIds?: string[] | null;
  minOrderAmount?: number | null; maxUses?: number | null; usedCount: number;
  validUntil?: Date | null; isActive: boolean;
}

export function CouponsAdmin({ initialCoupons, menuItems }: { initialCoupons: Coupon[]; menuItems: { id: string; name: string }[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const form = useForm<any>({ defaultValues: { code: "", description: "", discountType: "flat", discountValue: "", minOrderAmount: "", maxUses: "", isActive: true } });
  const watchedType = form.watch("discountType");

  const openCreate = () => { form.reset({ code: "", description: "", discountType: "flat", discountValue: "", minOrderAmount: "", maxUses: "", isActive: true }); setSelectedItemIds([]); setEditingCoupon(null); setDialogOpen(true); };
  const openEdit = (c: Coupon) => { form.reset({ ...c, discountValue: String(c.discountValue), minOrderAmount: String(c.minOrderAmount || ""), maxUses: String(c.maxUses || "") }); setSelectedItemIds((c.applicableItemIds as string[]) || []); setEditingCoupon(c); setDialogOpen(true); };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    const payload = {
      ...data,
      discountValue: Number(data.discountValue),
      minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : undefined,
      maxUses: data.maxUses ? Number(data.maxUses) : undefined,
      applicableItemIds: selectedItemIds.length > 0 ? selectedItemIds : undefined,
    };
    const res = editingCoupon ? await updateCoupon(editingCoupon.id, payload) : await createCoupon(payload);
    if (res.success) {
      toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
      setCoupons(prev => editingCoupon ? prev.map(c => c.id === editingCoupon.id ? res.data as Coupon : c) : [res.data as Coupon, ...prev]);
      setDialogOpen(false);
    } else { toast.error(res.error); }
    setIsSaving(false);
  };

  const handleToggle = async (c: Coupon) => {
    const res = await updateCoupon(c.id, { isActive: !c.isActive });
    if (res.success) setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCoupon(id);
    if (res.success) { setCoupons(prev => prev.filter(c => c.id !== id)); toast.success("Deleted"); }
  };

  const toggleItem = (id: string) => setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      <Button onClick={openCreate} className="gap-2 rounded-sm"><Plus className="w-4 h-4" /> New Coupon</Button>

      {coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <Ticket className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No coupons created yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map(c => (
            <div key={c.id} className="bg-white border border-border/50 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono font-black text-sm">{c.code}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {c.discountType === "flat" ? `Rs. ${c.discountValue} OFF` : `${c.discountValue}% OFF`}
                  </Badge>
                  {(c.applicableItemIds as string[] | null)?.length ? (
                    <Badge variant="secondary" className="text-[10px]">Per-Item</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">All Items</Badge>
                  )}
                  {!c.isActive && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Used: {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}{c.validUntil ? ` · Expires ${new Date(c.validUntil).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={c.isActive} onCheckedChange={() => handleToggle(c)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to delete this coupon? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCoupon ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input {...form.register("code", { required: true })} placeholder="EID2025" className="mt-1 rounded-sm uppercase font-mono" onChange={e => form.setValue("code", e.target.value.toUpperCase())} />
            </div>
            <div><Label>Description (Optional)</Label><Input {...form.register("description")} className="mt-1 rounded-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={watchedType} onValueChange={v => form.setValue("discountType", v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="flat">Flat (Rs.)</SelectItem><SelectItem value="percent">Percent (%)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>{watchedType === "flat" ? "Amount (Rs.)" : "Percent (%)"}</Label>
                <Input type="number" {...form.register("discountValue", { required: true })} className="mt-1 rounded-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Order (Rs.)</Label><Input type="number" {...form.register("minOrderAmount")} placeholder="0 = no minimum" className="mt-1 rounded-sm" /></div>
              <div><Label>Max Uses</Label><Input type="number" {...form.register("maxUses")} placeholder="Leave blank = unlimited" className="mt-1 rounded-sm" /></div>
            </div>

            <div>
              <Label className="mb-2 block">Applicable Items <span className="text-muted-foreground font-normal">(leave empty = all items)</span></Label>
              <div className="border border-border/50 rounded-sm max-h-40 overflow-y-auto p-2 space-y-1">
                {menuItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 px-2 py-1 rounded">
                    <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="rounded" />
                    <span className="text-sm">{item.name}</span>
                  </label>
                ))}
              </div>
              {selectedItemIds.length > 0 && <p className="text-xs text-primary mt-1">{selectedItemIds.length} item(s) selected — per-item scope</p>}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.watch("isActive")} onCheckedChange={v => form.setValue("isActive", v)} id="isActiveCoupon" />
              <Label htmlFor="isActiveCoupon">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : (editingCoupon ? "Update" : "Create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
