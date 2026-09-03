// lib/validations/checkout.ts
import { z } from "zod";

export const checkoutSchema = z
  .object({
    orderType: z.enum(["delivery", "pickup"]),
    customerName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    customerPhone: z
      .string()
      .regex(/^03\d{9}$/, "Please enter a valid Pakistani number (e.g. 03001234567)"),
    deliveryAddress: z.string().optional(),
    deliveryZone: z.string().optional(),
    deliveryNotes: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    paymentMethod: z.enum(["COD", "JazzCash", "EasyPaisa", "Bank"], {
      message: "Please select a payment method",
    }),
    couponCode: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "delivery") {
      if (!data.deliveryZone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryZone"],
          message: "Please select a delivery area",
        });
      }
      if (!data.deliveryAddress || data.deliveryAddress.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryAddress"],
          message: "Complete address must be at least 5 characters",
        });
      }
    }
  });

export type CheckoutValues = z.infer<typeof checkoutSchema>;
