import * as z from "zod";

export const inventoryItemSchema = z.object({
  itemName: z.string().min(2, "Item name must be at least 2 characters").max(100, "Item name is too long"),
  unit: z.string().min(1, "Please provide a unit of measurement (e.g., kg, pcs)"),
  lowStockThreshold: z.coerce.number().int().min(0, "Threshold must be 0 or greater").default(10),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export const stockAdjustmentSchema = z.object({
  inventoryItemId: z.string().uuid("Invalid item ID"),
  adjustmentType: z.enum(["add", "subtract", "set"]),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or greater"),
  notes: z.string().optional(),
});

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;
