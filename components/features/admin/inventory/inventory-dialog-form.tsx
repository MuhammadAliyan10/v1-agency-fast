"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inventoryItemSchema, type InventoryItemFormValues } from "@/lib/validations/inventory";
import { upsertInventoryItem } from "@/server/actions/inventory";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryDialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: any | null;
}

export function InventoryDialogForm({ open, onOpenChange, initialData }: InventoryDialogFormProps) {
  const isEditMode = !!initialData;
  const [isPending, startTransition] = useTransition();

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema) as any,
    defaultValues: {
      itemName: "",
      unit: "pcs",
      lowStockThreshold: 10,
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        itemName: initialData.itemName || "",
        unit: initialData.unit || "pcs",
        lowStockThreshold: initialData.lowStockThreshold || 0,
      });
    } else if (open && !initialData) {
      form.reset({
        itemName: "",
        unit: "pcs",
        lowStockThreshold: 10,
      });
    }
  }, [open, initialData, form]);

  const onSubmit = (values: InventoryItemFormValues) => {
    startTransition(async () => {
      const res = await upsertInventoryItem(values, initialData?.id);
      if (res.success) {
        toast.success(isEditMode ? "Inventory item updated" : "Inventory item created");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to save item");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Inventory Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update inventory item details." : "Define a new material or ingredient to track."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tomato Paste" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="g">Grams (g)</SelectItem>
                        <SelectItem value="liters">Liters (L)</SelectItem>
                        <SelectItem value="ml">Milliliters (ml)</SelectItem>
                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="packs">Packs</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert At</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
