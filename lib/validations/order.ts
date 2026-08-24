import { z } from "zod";

export const createOrderSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z
    .string()
    .regex(
      /^((\+92)|(0092)|(0))?3[0-9]{9}$/,
      "Invalid Pakistani phone number format"
    ),
  deliveryAddress: z.string().min(5, "Delivery address must be at least 5 characters"),
  paymentMethod: z.enum(["COD", "JazzCash", "EasyPaisa"]),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        variantId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().min(1),
        specialInstructions: z.string().optional().nullable(),
      })
    )
    .min(1, "Order must contain at least one item"),
  idempotencyKey: z.string().optional(),
  specialNotes: z.string().optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const validTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatusSchema = z
  .object({
    currentStatus: z.enum([
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ]),
    targetStatus: z.enum([
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ]),
  })
  .refine(
    (data) => {
      const allowed = validTransitions[data.currentStatus] || [];
      return allowed.includes(data.targetStatus);
    },
    {
      message: "Invalid status transition",
      path: ["targetStatus"],
    }
  );

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
