"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Pencil, Info, Save, X, Calendar as CalendarIcon, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDeal, updateDeal, deleteDeal } from "@/server/actions/deals";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MenuItem { id: string; name: string; basePrice: number; categoryId: string; }
interface Category { id: string; name: string; items: MenuItem[]; }
interface DealSlot { id?: string; slotName: string; quantity: number; menuItemId?: string | null; categoryId?: string | null; requiredVariantName?: string | null; }
interface Deal {
  id: string; name: string; description?: string | null; imageUrl?: string | null;
  dealType: "combo" | "event"; eventLabel?: string | null;
  originalPrice: number; dealPrice: number; slots: DealSlot[];
  validFrom?: Date | null; validUntil?: Date | null; isActive: boolean; isArchived?: boolean;
}

export function DealsAdmin({ initialDeals, menuItems, categories }: { initialDeals: Deal[]; menuItems: MenuItem[]; categories: Category[] }) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<any>({ 
    defaultValues: { 
      name: "", description: "", imageUrl: "", dealType: "combo", 
      eventLabel: "", originalPrice: 0, dealPrice: 0, slots: [], isActive: true 
    } 
  });
  
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "slots" });
  
  const watchedSlots = form.watch("slots");
  
  // Auto-calculate original price based on slots
  useEffect(() => {
    let maxTotal = 0;
    if (watchedSlots && Array.isArray(watchedSlots)) {
      watchedSlots.forEach((slot: any) => {
        if (!slot) return;
        const qty = parseInt(slot.quantity) || 1;
        let maxItemPrice = 0;
        
        if (slot.menuItemId && slot.menuItemId !== "none") {
          const item = menuItems.find(m => m.id === slot.menuItemId);
          if (item) maxItemPrice = item.basePrice;
        } else if (slot.categoryId && slot.categoryId !== "none") {
          const cat = categories.find(c => c.id === slot.categoryId);
          if (cat && cat.items) {
            maxItemPrice = Math.max(...cat.items.map(i => i.basePrice), 0);
          }
        }
        
        maxTotal += maxItemPrice * qty;
      });
    }
    
    if (maxTotal > 0) {
      form.setValue("originalPrice", maxTotal, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedSlots, menuItems, categories, form]);

  const openCreate = () => { 
    form.reset({ name: "", description: "", imageUrl: "", dealType: "combo", eventLabel: "", originalPrice: 0, dealPrice: 0, slots: [], isActive: true }); 
    setEditingDeal(null); 
    setDialogOpen(true); 
  };
  
  const openEdit = (deal: Deal) => {
    form.reset({ 
      ...deal, 
      originalPrice: deal.originalPrice, 
      dealPrice: deal.dealPrice,
      slots: deal.slots.map(s => ({
        ...s,
        menuItemId: s.menuItemId || "none",
        categoryId: s.categoryId || "none",
        requiredVariantName: s.requiredVariantName || ""
      }))
    });
    setEditingDeal(deal); 
    setDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    // Clean up slots before saving
    const cleanSlots = data.slots.map((s: any) => ({
      slotName: s.slotName,
      quantity: Number(s.quantity),
      menuItemId: s.menuItemId === "none" ? null : s.menuItemId,
      categoryId: s.categoryId === "none" ? null : s.categoryId,
      requiredVariantName: s.requiredVariantName || null
    }));
    
    const payload = { 
      ...data, 
      originalPrice: Number(data.originalPrice), 
      dealPrice: Number(data.dealPrice),
      slots: cleanSlots
    };
    
    const res = editingDeal ? await updateDeal(editingDeal.id, payload) : await createDeal(payload);
    
    if (res.success) {
      toast.success(editingDeal ? "Deal updated successfully" : "Deal created successfully");
      const updatedDeal = { ...res.data, slots: cleanSlots } as unknown as Deal;
      setDeals(prev => editingDeal ? prev.map(d => d.id === editingDeal.id ? updatedDeal : d) : [updatedDeal, ...prev]);
      setDialogOpen(false);
    } else { 
      toast.error(res.error); 
    }
    setIsSaving(false);
  };

  const handleToggle = (deal: Deal) => {
    const newState = !deal.isActive;
    // Optimistic UI update
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, isActive: newState } : d));
    
    startTransition(async () => {
      const res = await updateDeal(deal.id, { isActive: newState });
      if (!res.success) {
        toast.error("Failed to update status");
        // Revert on failure
        setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, isActive: !newState } : d));
      }
    });
  };

  const handleDelete = async (id: string) => {
    const res = await deleteDeal(id);
    if (res.success) { 
      setDeals(prev => prev.filter(d => d.id !== id)); 
      toast.success("Deal archived successfully"); 
    } else {
      toast.error(res.error);
    }
  };

  const watchedType = form.watch("dealType");
  const currentOriginalPrice = form.watch("originalPrice");
  const currentDealPrice = form.watch("dealPrice");
  
  const discountPercent = currentOriginalPrice > 0 
    ? Math.round(((currentOriginalPrice - currentDealPrice) / currentOriginalPrice) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        heading="Deals & Combos" 
        description="Create dynamic event deals and fixed combo packages for the storefront and POS."
        className="mb-6 pb-4 border-b"
      >
        <Button onClick={openCreate} className="gap-2 shadow-sm font-bold"><Plus className="w-4 h-4" /> Create Deal</Button>
      </PageHeader>

      {deals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed bg-muted/10">
          <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg text-foreground">No Deals Available</p>
          <p className="text-sm mt-1">Create your first combo or event deal to attract more customers.</p>
          <Button onClick={openCreate} variant="outline" className="mt-6 gap-2"><Plus className="w-4 h-4" /> Create Deal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {deals.map(deal => {
            const saveAmount = deal.originalPrice - deal.dealPrice;
            const percent = deal.originalPrice > 0 ? Math.round((saveAmount / deal.originalPrice) * 100) : 0;
            
            return (
              <div key={deal.id} className={cn(
                "bg-card border  overflow-hidden shadow-sm transition-all hover:shadow-md flex flex-col",
                !deal.isActive && "opacity-60 grayscale-[0.5]"
              )}>
                {/* Header / Image Area */}
                <div className="relative h-32 bg-muted flex items-center justify-center p-4 border-b">
                  {deal.imageUrl ? (
                    <img src={deal.imageUrl} alt={deal.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  ) : (
                    <PackageOpen className="w-12 h-12 opacity-10" />
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    <Badge className={cn("uppercase text-[10px] font-black tracking-widest shadow-sm", 
                      deal.dealType === "event" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"
                    )}>
                      {deal.dealType}
                    </Badge>
                    {deal.eventLabel && <Badge variant="secondary" className="text-[10px] uppercase font-bold shadow-sm backdrop-blur-md bg-background/80">{deal.eventLabel}</Badge>}
                  </div>
                  <div className="absolute top-3 right-3">
                    <Switch checked={deal.isActive} onCheckedChange={() => handleToggle(deal)} disabled={isPending} />
                  </div>
                  {/* Status Banner */}
                  {!deal.isActive && (
                    <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm p-1.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest border-t">
                      Inactive
                    </div>
                  )}
                </div>
                
                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-black text-lg truncate leading-tight mb-1">{deal.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1 min-h-[32px]">
                    {deal.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-dashed">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Price</span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-xl text-primary tracking-tight">Rs. {deal.dealPrice}</span>
                        <span className="text-xs font-bold text-muted-foreground line-through">Rs. {deal.originalPrice}</span>
                      </div>
                    </div>
                    {percent > 0 && (
                      <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 font-black px-2 shadow-sm">
                        {percent}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Footer Stats & Actions */}
                <div className="bg-muted/30 px-4 py-2.5 border-t flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {(deal.slots || []).length} Slots
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(deal)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-100 hover:text-rose-600 text-muted-foreground">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Deal?</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this deal? It will be archived and no longer available.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(deal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal Builder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden shadow-2xl border-0">
          <div className="bg-primary/5 p-6 pb-4 border-b border-primary/10">
            <DialogTitle className="text-2xl font-black">{editingDeal ? "Edit Deal Structure" : "Create New Deal"}</DialogTitle>
            <DialogDescription className="mt-1 font-medium">
              Configure the deal details and slot requirements.
            </DialogDescription>
          </div>
          
          <form onSubmit={form.handleSubmit(handleSave)}>
            <Tabs defaultValue="info" className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="w-full flex justify-start mb-4 h-auto p-0 bg-transparent border-b rounded-none">
                  <TabsTrigger value="info" className="font-bold text-sm h-11 px-6 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground">
                    1. Deal Details
                  </TabsTrigger>
                  <TabsTrigger value="slots" className="font-bold text-sm h-11 px-6 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground">
                    2. Deal Builder <Badge variant="secondary" className="ml-2 bg-muted-foreground/20 text-foreground text-[10px] h-5 px-1.5">{fields.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto overflow-x-hidden">
                {/* Tab 1: Deal Information */}
                <TabsContent value="info" className="space-y-5 mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Deal Name</Label>
                      <Input {...form.register("name", { required: true })} placeholder="e.g. Family Supreme Combo" className="font-semibold" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
                      <Select value={watchedType} onValueChange={v => form.setValue("dealType", v)}>
                        <SelectTrigger className="font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="combo" className="font-medium">Combo Package</SelectItem>
                          <SelectItem value="event" className="font-medium">Event Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {watchedType === "event" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Label</Label>
                        <Input {...form.register("eventLabel")} placeholder="e.g. Ramadan Iftar" className="font-semibold" />
                      </div>
                    )}
                    
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                      <Textarea {...form.register("description")} placeholder="Describe what's included..." className="resize-none min-h-[80px]" />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Image URL</Label>
                      <Input {...form.register("imageUrl")} placeholder="https://..." />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 border border-dashed flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold text-foreground flex items-center gap-2">
                        Deal Status
                        <Badge variant={form.watch("isActive") ? "default" : "secondary"} className="uppercase text-[9px] tracking-widest h-5 px-1.5">
                          {form.watch("isActive") ? "Active" : "Archived"}
                        </Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground font-medium">Visible and purchasable by customers</p>
                    </div>
                    <Switch {...form.register("isActive")} checked={form.watch("isActive")} onCheckedChange={v => form.setValue("isActive", v)} />
                  </div>
                </TabsContent>

                {/* Tab 2: Deal Builder / Slots */}
                <TabsContent value="slots" className="space-y-5 mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="flex items-center justify-between border-b pb-3 border-dashed">
                    <div>
                      <h3 className="font-bold text-sm">Deal Slots Configuration</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Add fixed items or category choices to build the combo.</p>
                    </div>
                    <Button type="button" size="sm" onClick={() => append({ slotName: "", quantity: 1, menuItemId: "none", categoryId: "none", requiredVariantName: "" })} className="h-8 gap-1 font-bold text-xs shadow-sm">
                      <Plus className="w-3.5 h-3.5" /> Add Slot
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-muted/10 border border-dashed">
                      <PackageOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="font-medium text-sm">No slots added yet.</p>
                      <p className="text-[11px] mt-1 px-4">A Deal requires at least one slot (e.g. "1x Zinger Burger" or "1x Any Medium Pizza").</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="relative bg-card border p-3 sm:p-4 shadow-sm group transition-all hover:border-primary/30">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute -top-2.5 -right-2.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            onClick={() => remove(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            {/* Slot Name & Qty */}
                            <div className="sm:col-span-12 flex gap-3 items-end">
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Slot Display Name</Label>
                                <Input {...form.register(`slots.${index}.slotName`, { required: true })} placeholder="e.g. 1x Large Pizza Choice" className="h-9 font-semibold text-sm" />
                              </div>
                              <div className="w-20 space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Qty</Label>
                                <Input type="number" min={1} {...form.register(`slots.${index}.quantity`)} className="h-9 font-bold text-center" />
                              </div>
                            </div>
                            
                            {/* Assignment Type */}
                            <div className="sm:col-span-12 bg-muted/40 p-3 border border-black/5 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                <Info className="w-3.5 h-3.5" /> Slot Assignment (Choose One)
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold uppercase">Fixed Menu Item</Label>
                                  <Select 
                                    value={form.watch(`slots.${index}.menuItemId`)} 
                                    onValueChange={v => {
                                      form.setValue(`slots.${index}.menuItemId`, v);
                                      if (v !== "none") form.setValue(`slots.${index}.categoryId`, "none");
                                    }}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select specific item" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                                      {menuItems.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (Rs. {m.basePrice})</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold uppercase">OR Category Choice</Label>
                                  <Select 
                                    value={form.watch(`slots.${index}.categoryId`)} 
                                    onValueChange={v => {
                                      form.setValue(`slots.${index}.categoryId`, v);
                                      if (v !== "none") form.setValue(`slots.${index}.menuItemId`, "none");
                                    }}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                                      {categories.map(c => <SelectItem key={c.id} value={c.id}>Any {c.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="space-y-1.5 pt-2 border-t border-black/5">
                                <Label className="text-[10px] font-bold uppercase flex items-center gap-1.5">
                                  Required Variant Name (Optional)
                                  <span className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[8px] tracking-widest">ADVANCED</span>
                                </Label>
                                <Input {...form.register(`slots.${index}.requiredVariantName`)} placeholder="e.g. Medium (Forces user to select a 'Medium' size)" className="h-8 text-xs" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Summary Box inside Tab 2 */}
                  <div className="mt-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
                    <h4 className="font-black text-sm uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Pricing & Savings
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Original Value (Auto)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rs.</span>
                          <Input 
                            type="number" 
                            disabled 
                            {...form.register("originalPrice")} 
                            className="pl-9 h-10 font-black text-foreground bg-background/50 border-0 shadow-inner" 
                          />
                        </div>
                        <p className="text-[9px] font-medium text-muted-foreground leading-tight">Calculated using maximum prices of selected slots.</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-primary">Selling Price (Deal Price)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rs.</span>
                          <Input 
                            type="number" 
                            {...form.register("dealPrice", { required: true })} 
                            className="pl-9 h-10 font-black text-primary border-primary/30 focus-visible:ring-primary shadow-sm" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    {discountPercent > 0 && (
                      <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground/70">Customer saves Rs. {currentOriginalPrice - currentDealPrice}</span>
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black tracking-wider text-xs px-2 shadow-sm">
                          {discountPercent}% DISCOUNT
                        </Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>

              <div className="p-4 sm:px-6 bg-muted/20 border-t flex items-center justify-end gap-3 mt-auto">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="font-semibold text-muted-foreground">Cancel</Button>
                <Button type="submit" disabled={isSaving || fields.length === 0} className="font-bold shadow-md gap-2 px-6">
                  {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> {editingDeal ? "Update Deal" : "Create Deal"}</>}
                </Button>
              </div>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
