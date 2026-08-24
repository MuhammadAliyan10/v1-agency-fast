import * as z from "zod";

export const menuItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  categoryId: z.string().uuid("Please select a valid category"),
  basePrice: z.coerce.number().min(0, "Price cannot be negative"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Variant name is required"),
      price: z.coerce.number().min(0, "Price cannot be negative"),
    })
  ).optional(),
  addOns: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Add-on name is required"),
      price: z.coerce.number().min(0, "Price cannot be negative"),
    })
  ).optional(),
});

export type MenuItemValues = z.infer<typeof menuItemSchema>;
