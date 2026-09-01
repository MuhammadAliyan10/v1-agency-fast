// lib/validations/menu.ts
import * as z from "zod";

const variantSchema = z.object({
  id:          z.string().optional(),
  name:        z.string().min(1, "Variant name is required"),
  price:       z.coerce.number().min(0, "Price cannot be negative"),
  isAvailable: z.boolean().default(true),
});

const addOnSchema = z.object({
  id:          z.string().optional(),
  name:        z.string().min(1, "Add-on name is required"),
  price:       z.coerce.number().min(0, "Price cannot be negative"),
  isAvailable: z.boolean().default(true),
});

const tagsSchema = z.object({
  isSpicy:   z.boolean().default(false),
  isVeg:     z.boolean().default(false),
  isNew:     z.boolean().default(false),
  isPopular: z.boolean().default(false),
});

export const menuItemSchema = z.object({
  name:            z.string().min(2, "Name must be at least 2 characters"),
  description:     z.string().optional(),
  categoryId:      z.string().uuid("Please select a valid category"),
  basePrice:       z.coerce.number().min(0, "Price cannot be negative"),
  imageUrl:        z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isAvailable:     z.boolean().default(true),
  isFeatured:      z.boolean().default(false),
  preparationTime: z.coerce.number().int().min(0).optional().nullable(),
  tags:            tagsSchema.default({ isSpicy: false, isVeg: false, isNew: false, isPopular: false }),
  variants:        z.array(variantSchema).optional(),
  addOns:          z.array(addOnSchema).optional(),
});

export type MenuItemValues   = z.infer<typeof menuItemSchema>;
export type VariantValue     = z.infer<typeof variantSchema>;
export type AddOnValue       = z.infer<typeof addOnSchema>;
export type TagsValue        = z.infer<typeof tagsSchema>;
