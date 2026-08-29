import { z } from "zod";

export const checkoutSchema = z.object({
  customerName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  customerPhone: z
    .string()
    .regex(/^03\d{9}$/, "Please enter a valid Pakistani number (e.g. 03001234567)"),
  deliveryAddress: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(255, "Address must be less than 255 characters"),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(["COD", "JazzCash", "EasyPaisa"], {
    message: "Please select a payment method",
  }),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;
