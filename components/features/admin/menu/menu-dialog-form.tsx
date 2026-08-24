"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { menuItemSchema, type MenuItemValues } from "@/lib/validations/menu";
import { upsertMenuItem } from "@/server/actions/menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuDialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: any | null;
  categories: { id: string; name: string }[];
}

export function MenuDialogForm({ open, onOpenChange, initialData, categories }: MenuDialogFormProps) {
  const isEditMode = !!initialData;

  const form = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      basePrice: 0,
      imageUrl: "",
      isAvailable: true,
      isFeatured: false,
      variants: [],
      addOns: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const { fields: addOnFields, append: appendAddOn, remove: removeAddOn } = useFieldArray({
    control: form.control,
    name: "addOns",
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        categoryId: initialData.categoryId || "",
        basePrice: initialData.basePrice || 0,
        imageUrl: initialData.imageUrl || "",
        isAvailable: initialData.isAvailable ?? true,
        isFeatured: initialData.isFeatured ?? false,
        variants: initialData.variants?.map((v: any) => ({ id: v.id, name: v.name, price: v.price })) || [],
        addOns: initialData.addOns?.map((a: any) => ({ id: a.id, name: a.name, price: a.price })) || [],
      });
    } else if (open && !initialData) {
      form.reset({
        name: "",
        description: "",
        categoryId: "",
        basePrice: 0,
        imageUrl: "",
        isAvailable: true,
        isFeatured: false,
        variants: [],
        addOns: [],
      });
    }
  }, [open, initialData, form]);

  const onSubmit = async (values: MenuItemValues) => {
    const res = await upsertMenuItem(values, initialData?.id);
    if (res.success) {
      toast.success(isEditMode ? "Menu item updated" : "Menu item created");
      onOpenChange(false);
    } else {
      toast.error(res.error || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] sm:w-[90vw] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditMode ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the details of your menu item." : "Fill out the form to add a new item to your menu."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[75vh] max-h-[75vh]">
            <ScrollArea className="flex-1 px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                
                {/* Left Column */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Zinger Burger" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (Rs.)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the item..." 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="isAvailable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full">
                          <div className="space-y-0.5">
                            <FormLabel>Available</FormLabel>
                            <FormDescription className="text-xs">
                              In stock?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isFeatured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full">
                          <div className="space-y-0.5">
                            <FormLabel>Featured</FormLabel>
                            <FormDescription className="text-xs">
                              Highlight on menu
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Variants Array */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Variants (Optional)</h4>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendVariant({ name: "", price: 0 })}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    {variantFields.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">e.g., Small, Medium, Large sizes.</p>
                    )}
                    <div className="space-y-2">
                      {variantFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                          <FormField
                            control={form.control}
                            name={`variants.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-0">
                                <FormControl>
                                  <Input placeholder="Size/Type" {...field} className="h-8 text-sm" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`variants.${index}.price`}
                            render={({ field }) => (
                              <FormItem className="w-24 space-y-0">
                                <FormControl>
                                  <Input type="number" placeholder="Price" {...field} className="h-8 text-sm" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={() => removeVariant(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add-Ons Array */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Add-Ons (Optional)</h4>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendAddOn({ name: "", price: 0 })}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    {addOnFields.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">e.g., Extra Cheese, Mayo.</p>
                    )}
                    <div className="space-y-2">
                      {addOnFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                          <FormField
                            control={form.control}
                            name={`addOns.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-0">
                                <FormControl>
                                  <Input placeholder="Add-on Name" {...field} className="h-8 text-sm" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`addOns.${index}.price`}
                            render={({ field }) => (
                              <FormItem className="w-24 space-y-0">
                                <FormControl>
                                  <Input type="number" placeholder="Price" {...field} className="h-8 text-sm" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={() => removeAddOn(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Menu Item"
                )}
              </Button>
            </div>
          </form>
        </Form>

      </DialogContent>
    </Dialog>
  );
}
