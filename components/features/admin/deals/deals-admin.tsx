"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Tag, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDeal, updateDeal, deleteDeal } from "@/server/actions/deals";
import { PageHeader } from "@/components/shared/page-header";

interface MenuItem { id: string; name: string; basePrice: number; }
interface DealItem { menuItemId: string; itemName: string; quantity: number; unitPrice: number; }
interface Deal {
  id: string; name: string; description?: string | null; imageUrl?: string | null;
  dealType: "combo" | "event"; eventLabel?: string | null;
  originalPrice: number; dealPrice: number; items: DealItem[];
  validFrom?: Date | null; validUntil?: Date | null; isActive: boolean;
}

export function DealsAdmin({ initialDeals, menuItems }: { initialDeals: Deal[]; menuItems: MenuItem[] }) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<any>({ defaultValues: { name: "", description: "", imageUrl: "", dealType: "combo", eventLabel: "", originalPrice: "", dealPrice: "", items: [], isActive: true } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const openCreate = () => { form.reset({ name: "", description: "", imageUrl: "", dealType: "combo", eventLabel: "", originalPrice: "", dealPrice: "", items: [], isActive: true }); setEditingDeal(null); setDialogOpen(true); };
  const openEdit = (deal: Deal) => {
    form.reset({ ...deal, originalPrice: String(deal.originalPrice), dealPrice: String(deal.dealPrice) });
    setEditingDeal(deal); setDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    const payload = { ...data, originalPrice: Number(data.originalPrice), dealPrice: Number(data.dealPrice) };
    const res = editingDeal ? await updateDeal(editingDeal.id, payload) : await createDeal(payload);
    if (res.success) {
      toast.success(editingDeal ? "Deal updated" : "Deal created");
      setDeals(prev => editingDeal ? prev.map(d => d.id === editingDeal.id ? res.data as Deal : d) : [res.data as Deal, ...prev]);
      setDialogOpen(false);
    } else { toast.error(res.error); }
    setIsSaving(false);
  };

  const handleToggle = async (deal: Deal) => {
    const res = await updateDeal(deal.id, { isActive: !deal.isActive });
    if (res.success) setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, isActive: !d.isActive } : d));
    else toast.error("Failed to update");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    const res = await deleteDeal(id);
    if (res.success) { setDeals(prev => prev.filter(d => d.id !== id)); toast.success("Deleted"); }
    else toast.error(res.error);
  };

  const watchedType = form.watch("dealType");

  return (
    <div className="space-y-4">
      <PageHeader 
        heading="Deals & Combos" 
        description="Create event deals and fixed combo offers for customers."
        className="mb-6 pb-4 border-b"
      >
        <Button onClick={openCreate} className="gap-2 rounded-sm"><Plus className="w-4 h-4" /> New Deal</Button>
      </PageHeader>

      {deals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No deals created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <div key={deal.id} className="bg-white border border-border/50 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-sm truncate">{deal.name}</h3>
                  <Badge variant={deal.dealType === "event" ? "secondary" : "outline"} className="text-[10px] uppercase">{deal.dealType}</Badge>
                  {deal.eventLabel && <Badge variant="outline" className="text-[10px]">{deal.eventLabel}</Badge>}
                  {!deal.isActive && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rs. {deal.dealPrice} <span className="line-through ml-1">Rs. {deal.originalPrice}</span>
                  {" · "}{(deal.items as DealItem[]).length} items
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={deal.isActive} onCheckedChange={() => handleToggle(deal)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(deal)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(deal.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDeal ? "Edit Deal" : "New Deal"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Name</Label><Input {...form.register("name", { required: true })} className="mt-1 rounded-sm" /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea {...form.register("description")} className="mt-1 rounded-sm resize-none" /></div>
              <div>
                <Label>Deal Type</Label>
                <Select value={watchedType} onValueChange={v => form.setValue("dealType", v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="combo">Combo</SelectItem><SelectItem value="event">Event</SelectItem></SelectContent>
                </Select>
              </div>
              {watchedType === "event" && <div><Label>Event Label</Label><Input {...form.register("eventLabel")} placeholder="e.g. Eid Special" className="mt-1 rounded-sm" /></div>}
              <div><Label>Original Price (Rs.)</Label><Input type="number" {...form.register("originalPrice", { required: true })} className="mt-1 rounded-sm" /></div>
              <div><Label>Deal Price (Rs.)</Label><Input type="number" {...form.register("dealPrice", { required: true })} className="mt-1 rounded-sm" /></div>
              <div className="col-span-2"><Label>Image URL (Optional)</Label><Input {...form.register("imageUrl")} className="mt-1 rounded-sm" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items Included</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-sm gap-1" onClick={() => append({ menuItemId: "", itemName: "", quantity: 1, unitPrice: 0 })}>
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <Select onValueChange={v => {
                      const item = menuItems.find(m => m.id === v);
                      if (item) { form.setValue(`items.${index}.menuItemId`, item.id); form.setValue(`items.${index}.itemName`, item.name); form.setValue(`items.${index}.unitPrice`, item.basePrice); }
                    }}>
                      <SelectTrigger className="rounded-sm flex-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{menuItems.map(m => <SelectItem key={m.id} value={m.id}>{m.name} — Rs.{m.basePrice}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min={1} {...form.register(`items.${index}.quantity`)} placeholder="Qty" className="rounded-sm w-16" />
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive shrink-0" onClick={() => remove(index)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch {...form.register("isActive")} checked={form.watch("isActive")} onCheckedChange={v => form.setValue("isActive", v)} id="isActive" />
              <Label htmlFor="isActive">Active (visible on storefront)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : (editingDeal ? "Update Deal" : "Create Deal")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
