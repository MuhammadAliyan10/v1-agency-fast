// components/features/admin/menu/menu-dialog-form.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, Flame, Leaf, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { menuItemSchema, type MenuItemValues } from "@/lib/validations/menu";
import { upsertMenuItem } from "@/server/actions/menu";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuDialogFormProps {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  initialData:    MenuItemValues & { id?: string; variants?: (MenuItemValues["variants"] & { id?: string })[]; addOns?: (MenuItemValues["addOns"] & { id?: string })[] } | null;
  categories:     { id: string; name: string }[];
}

const DEFAULT_VALUES: MenuItemValues = {
  name:            "",
  description:     "",
  categoryId:      "",
  basePrice:       0,
  imageUrl:        "",
  isAvailable:     true,
  isFeatured:      false,
  preparationTime: null,
  tags:            { isSpicy: false, isVeg: false, isNew: false, isPopular: false },
  variants:        [],
  addOns:          [],
};

const TAG_DEFINITIONS = [
  { key: "isSpicy"   as const, label: "Spicy",   icon: Flame,      color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30",    border: "border-rose-200 dark:border-rose-800" },
  { key: "isVeg"     as const, label: "Veg",     icon: Leaf,       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  { key: "isNew"     as const, label: "New",     icon: Sparkles,   color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/30",  border: "border-violet-200 dark:border-violet-800" },
  { key: "isPopular" as const, label: "Popular", icon: TrendingUp, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",    border: "border-amber-200 dark:border-amber-800" },
];

export function MenuDialogForm({ open, onOpenChange, initialData, categories }: MenuDialogFormProps) {
  const isEditMode = !!initialData;

  const form = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: DEFAULT_VALUES,
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control, name: "variants",
  });
  const { fields: addOnFields, append: appendAddOn, remove: removeAddOn } = useFieldArray({
    control: form.control, name: "addOns",
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name:            initialData.name ?? "",
        description:     initialData.description ?? "",
        categoryId:      initialData.categoryId ?? "",
        basePrice:       initialData.basePrice ?? 0,
        imageUrl:        initialData.imageUrl ?? "",
        isAvailable:     initialData.isAvailable ?? true,
        isFeatured:      initialData.isFeatured ?? false,
        preparationTime: initialData.preparationTime ?? null,
        tags: {
          isSpicy:   initialData.tags?.isSpicy   ?? false,
          isVeg:     initialData.tags?.isVeg     ?? false,
          isNew:     initialData.tags?.isNew     ?? false,
          isPopular: initialData.tags?.isPopular ?? false,
        },
        variants: (initialData.variants ?? []).map(v => ({
          id:          (v as { id?: string }).id,
          name:        v.name,
          price:       v.price,
          isAvailable: (v as { isAvailable?: boolean }).isAvailable ?? true,
        })),
        addOns: (initialData.addOns ?? []).map(a => ({
          id:          (a as { id?: string }).id,
          name:        a.name,
          price:       a.price,
          isAvailable: (a as { isAvailable?: boolean }).isAvailable ?? true,
        })),
      });
    } else if (open && !initialData) {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, initialData, form]);

  const onSubmit = async (values: MenuItemValues) => {
    const res = await upsertMenuItem(values, initialData?.id);
    if (res.success) {
      toast.success(isEditMode ? "Menu item updated" : "Menu item created");
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold">
            {isEditMode ? "Edit Menu Item" : "Add New Menu Item"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditMode ? "Update the details of your menu item." : "Fill out the form to add a new item to your menu."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[72vh]">
            <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 px-6 h-auto">
                <TabsTrigger 
                  value="basic"
                  className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-3 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="customization"
                  className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-3 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Customization
                  {((form.watch("variants")?.length ?? 0) + (form.watch("addOns")?.length ?? 0)) > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">
                      {(form.watch("variants")?.length ?? 0) + (form.watch("addOns")?.length ?? 0)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="attributes"
                  className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-3 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Attributes
                </TabsTrigger>
              </TabsList>

              {/* ── TAB 1: Basic Info ─────────────────────────────────────── */}
              <TabsContent value="basic" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-4">
                    <div className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl><Input placeholder="e.g. Zinger Burger" className="w-full" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="categoryId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="basePrice" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price (Rs.)</FormLabel>
                            <FormControl><Input type="number" min={0} className="w-full" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="preparationTime" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prep Time (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="e.g. 15"
                                className="w-full"
                                {...field}
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the item..." className="resize-none h-20 w-full" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4">
                      <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL (Optional)</FormLabel>
                          <FormControl><Input placeholder="https://..." className="w-full" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {form.watch("imageUrl") && (
                        <div className="rounded-xl border border-border overflow-hidden w-full aspect-video bg-muted">
                          <img
                            src={form.watch("imageUrl") ?? ""}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}

                      <div className="flex gap-3">
                        <FormField control={form.control} name="isAvailable" render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border p-4 flex-1">
                            <div>
                              <FormLabel className="text-sm font-semibold">Available</FormLabel>
                              <FormDescription className="text-xs">Visible on menu</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="isFeatured" render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border p-4 flex-1">
                            <div>
                              <FormLabel className="text-sm font-semibold">Featured</FormLabel>
                              <FormDescription className="text-xs">Highlighted</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── TAB 2: Customization ──────────────────────────────────── */}
              <TabsContent value="customization" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    {/* Variants */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">Variants</h4>
                          <p className="text-xs text-muted-foreground">Sizes, types, etc.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendVariant({ name: "", price: 0, isAvailable: true })}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                      {variantFields.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-lg text-center">
                          No variants yet — e.g. Small, Medium, Large
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {variantFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-center p-2 rounded-lg border border-border/60 bg-muted/20">
                              <FormField control={form.control} name={`variants.${index}.name`} render={({ field }) => (
                                <FormItem className="flex-1 space-y-0">
                                  <FormControl><Input placeholder="Size/Type" {...field} className="h-8 text-xs" /></FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`variants.${index}.price`} render={({ field }) => (
                                <FormItem className="w-20 space-y-0">
                                  <FormControl><Input type="number" placeholder="Rs." {...field} className="h-8 text-xs" /></FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`variants.${index}.isAvailable`} render={({ field }) => (
                                <FormItem className="space-y-0 shrink-0">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )} />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeVariant(index)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add-Ons */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">Add-Ons</h4>
                          <p className="text-xs text-muted-foreground">Extras, toppings, etc.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAddOn({ name: "", price: 0, isAvailable: true })}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                      {addOnFields.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-lg text-center">
                          No add-ons yet — e.g. Extra Cheese, Mayo
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {addOnFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-center p-2 rounded-lg border border-border/60 bg-muted/20">
                              <FormField control={form.control} name={`addOns.${index}.name`} render={({ field }) => (
                                <FormItem className="flex-1 space-y-0">
                                  <FormControl><Input placeholder="Add-on Name" {...field} className="h-8 text-xs" /></FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`addOns.${index}.price`} render={({ field }) => (
                                <FormItem className="w-20 space-y-0">
                                  <FormControl><Input type="number" placeholder="Rs." {...field} className="h-8 text-xs" /></FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name={`addOns.${index}.isAvailable`} render={({ field }) => (
                                <FormItem className="space-y-0 shrink-0">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )} />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeAddOn(index)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── TAB 3: Attributes ─────────────────────────────────────── */}
              <TabsContent value="attributes" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-6 py-4">
                  <div className="space-y-3 pb-4">
                    <p className="text-xs text-muted-foreground mb-4">
                      These tags are displayed on the customer-facing menu and used by the kitchen for dietary awareness.
                    </p>
                    {TAG_DEFINITIONS.map(tag => {
                      const Icon = tag.icon;
                      return (
                        <FormField key={tag.key} control={form.control} name={`tags.${tag.key}`} render={({ field }) => (
                          <FormItem className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${field.value ? `${tag.bg} ${tag.border}` : "border-border/60"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${field.value ? tag.bg : "bg-muted"}`}>
                                <Icon className={`w-4 h-4 ${field.value ? tag.color : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <FormLabel className="text-sm font-semibold cursor-pointer">{tag.label}</FormLabel>
                                <FormDescription className="text-xs">
                                  {tag.key === "isSpicy"   && "Contains spicy ingredients"}
                                  {tag.key === "isVeg"     && "Suitable for vegetarians"}
                                  {tag.key === "isNew"     && "Newly added to the menu"}
                                  {tag.key === "isPopular" && "Customer favourite item"}
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )} />
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  isEditMode ? "Save Changes" : "Create Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
