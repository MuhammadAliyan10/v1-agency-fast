import * as z from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and dashes"),
  description: z.string().max(300, "Description is too long").optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be 0 or greater").default(0),
  isActive: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
