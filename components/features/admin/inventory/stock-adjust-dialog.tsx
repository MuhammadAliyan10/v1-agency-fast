"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "@/lib/validations/inventory";
import { adjustStockQuantity } from "@/server/actions/inventory";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
}

export function StockAdjustDialog({ open, onOpenChange, item }: StockAdjustDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema) as any,
    defaultValues: {
      inventoryItemId: "",
      adjustmentType: "add",
      quantity: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({
        inventoryItemId: item.id,
        adjustmentType: "add",
        quantity: 0,
        notes: "",
      });
    }
  }, [open, item, form]);

  const onSubmit = (values: StockAdjustmentFormValues) => {
    startTransition(async () => {
      const res = await adjustStockQuantity(values);
      if (res.success) {
        toast.success("Stock adjusted successfully");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to adjust stock");
      }
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Adjust Stock</DialogTitle>
          <DialogDescription>
            Modify stock levels for <strong>{item.itemName}</strong>. Current stock: {item.stockQuantity} {item.unit}.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Adjustment Action</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="add" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Add Stock (e.g. Received shipment)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="subtract" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Subtract Stock (e.g. Waste, Spoilage)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="set" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Set Exact Value (e.g. Manual count)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity ({item.unit})</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Damaged goods, Restock" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Stock"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
