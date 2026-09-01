"use server";

import { db } from "@/database/db";
import { orders, orderItems, users, menuItems, itemVariants, itemAddOns } from "@/database/schema";
import { inArray, notInArray, eq, asc, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { STORE_CONSTANTS } from "@/lib/constants";
import { z } from "zod";
import { randomBytes } from "crypto";

export type OrderStatus =
  | "pending"
  | "approved"
  | "preparing"
  | "ready_for_pickup"
  | "delayed"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "served";

export type LiveOrder = typeof orders.$inferSelect & {
  rider: { name: string; phone: string } | null;
  items: typeof orderItems.$inferSelect[];
};

export async function getLiveOrders() {
  await requireAdmin();
  noStore();
  try {
    const ridersAlias = alias(users, "ridersAlias");

    const liveOrdersData = await db
      .select({
        order: orders,
        customer: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        },
        rider: {
          id: ridersAlias.id,
          name: ridersAlias.name,
          phone: ridersAlias.phone,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(ridersAlias, eq(orders.riderId, ridersAlias.id))
      .where(notInArray(orders.status, ["delivered", "cancelled", "rejected"]))
      .orderBy(desc(orders.createdAt));

    const liveOrderIds = liveOrdersData.map((o) => o.order.id);

    if (liveOrderIds.length === 0) {
      return { success: true, data: [] };
    }

    const itemsData = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, liveOrderIds));

    const formattedOrders = liveOrdersData.map(({ order, customer, rider }) => {
      const items = itemsData.filter((i) => i.orderId === order.id);
      return {
        ...order,
        customerName: order.customerName || customer?.name || "Guest",
        customerPhone: order.customerPhone || customer?.phone || "N/A",
        rider: rider?.id ? { name: rider.name, phone: rider.phone } : null,
        items,
      };
    });

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching live orders:", error);
    return { success: false, error: "Failed to fetch live orders" };
  }
}

export async function updateLiveOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  etaMinutes?: number
) {
  await requireAdmin();
  try {
    const updatePayload: Partial<typeof orders.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (etaMinutes && etaMinutes > 0) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + etaMinutes);
      updatePayload.estimatedReadyAt = eta;
    }

    await db.update(orders).set(updatePayload).where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, message: "Failed to update status" };
  }
}

export async function updateOrderItemStatus(
  itemId: string,
  newStatus: OrderItemStatus
) {
  await requireAdmin();
  try {
    await db.update(orderItems)
      .set({ status: newStatus })
      .where(eq(orderItems.id, itemId));
      
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { success: false, message: "Failed to update item status" };
  }
}

export async function appendItemsToOrder(
  orderId: string,
  items: {
    menuItemId: string;
    variantId?: string | null;
    itemName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    selectedAddOns?: any;
    specialInstructions?: string | null;
  }[]
) {
  await requireAdmin();
  try {
    // Get current order and items to determine round number and totals
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    if (!currentOrder) throw new Error("Order not found");

    const maxRound = Math.max(...currentOrder.items.map(i => i.roundNumber || 1), 1);
    const newRoundNumber = maxRound + 1;

    let additionalSubtotal = 0;

    const itemsToInsert = items.map(item => {
      additionalSubtotal += item.subtotal;
      return {
        orderId,
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        itemName: item.itemName,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        status: "pending" as OrderItemStatus,
        roundNumber: newRoundNumber,
        selectedAddOns: item.selectedAddOns,
        specialInstructions: item.specialInstructions,
      };
    });

    await db.transaction(async (tx) => {
      await tx.insert(orderItems).values(itemsToInsert);
      
      const newSubtotal = currentOrder.subtotal + additionalSubtotal;
      const newTotal = newSubtotal + currentOrder.deliveryFee - currentOrder.discountAmount;

      await tx.update(orders)
        .set({ 
          subtotal: newSubtotal, 
          totalAmount: newTotal,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    });

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error appending items:", error);
    return { success: false, message: "Failed to append items to order" };
  }
}

export async function markOrderPaid(orderId: string) {
  await requireAdmin();
  try {
    await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId));
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error marking order paid:", error);
    return { success: false, error: "Failed to mark order as paid" };
  }
}

export async function getAvailableRiders() {
  await requireAdmin();
  try {
    const riders = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
      })
      .from(users)
      .where(and(eq(users.role, "rider"), eq(users.isActive, true)))
      .orderBy(asc(users.name));
    return { success: true, data: riders };
  } catch (error) {
    console.error("Error fetching available riders:", error);
    return { success: false, error: "Failed to fetch available riders" };
  }
}

export async function assignRiderToOrder(orderId: string, riderId: string) {
  await requireAdmin();
  try {
    // Fetch rider phone for WhatsApp link generation
    const rider = await db.query.users.findFirst({
      where: eq(users.id, riderId),
    });

    await db
      .update(orders)
      .set({ riderId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");

    // Return rider phone so UI can open WhatsApp link
    return { success: true, riderPhone: rider?.phone ?? null, riderName: rider?.name ?? null };
  } catch (error) {
    console.error("Error assigning rider to order:", error);
    return { success: false, error: "Failed to assign rider" };
  }
}



/** Returns menu items with variants for manual order entry */
export async function getMenuForManualOrder() {
  await requireAdmin();
  try {
    const items = await db.query.menuItems.findMany({
      where: eq(menuItems.isAvailable, true),
      with: {
        category: true,
        variants: true,
      },
      orderBy: [asc(menuItems.name)],
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching menu for manual order:", error);
    return { success: false, error: "Failed to fetch menu" };
  }
}

// -----------------------------------------------------------------------------
// POS Manual Order Creation
// -----------------------------------------------------------------------------

export async function getStaffWaiters() {
  await requireAdmin();
  try {
    const staff = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.role, ["admin", "manager", "kitchen"]))
      .orderBy(asc(users.name));
    return { success: true, data: staff };
  } catch (error) {
    console.error("Error fetching staff waiters:", error);
    return { success: false, error: "Failed to fetch staff" };
  }
}

const manualOrderSchema = z.object({
  orderType: z.enum(["delivery", "pickup", "dine_in"]),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
  tableNumber: z.string().optional(),
  waiterId: z.string().optional().nullable(),
  deliveryFee: z.number().default(0),
  discountAmount: z.number().default(0),
  paymentMethod: z.enum(["COD", "Cash", "Card", "JazzCash", "EasyPaisa"]).default("Cash"),
  paymentStatus: z.enum(["paid", "unpaid"]).default("unpaid"),
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(1),
    selectedAddOns: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  })).min(1),
}).superRefine((data, ctx) => {
  if (data.orderType === "dine_in") {
    if (!data.waiterId || data.waiterId.trim() === "") {
      ctx.addIssue({ path: ["waiterId"], message: "Waiter is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
    if (!data.tableNumber || data.tableNumber.trim() === "") {
      ctx.addIssue({ path: ["tableNumber"], message: "Table Number is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Dine-In orders", code: z.ZodIssueCode.custom });
    }
  }
  if (data.orderType === "delivery") {
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Delivery", code: z.ZodIssueCode.custom });
    }
    if (!data.customerPhone || data.customerPhone.trim() === "") {
      ctx.addIssue({ path: ["customerPhone"], message: "Customer Phone is required for Delivery", code: z.ZodIssueCode.custom });
    }
    if (!data.deliveryAddress || data.deliveryAddress.trim() === "") {
      ctx.addIssue({ path: ["deliveryAddress"], message: "Delivery Address is required for Delivery", code: z.ZodIssueCode.custom });
    }
  }
  if (data.orderType === "pickup") {
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({ path: ["customerName"], message: "Customer Name is required for Pickup", code: z.ZodIssueCode.custom });
    }
    if (!data.customerPhone || data.customerPhone.trim() === "") {
      ctx.addIssue({ path: ["customerPhone"], message: "Customer Phone is required for Pickup", code: z.ZodIssueCode.custom });
    }
  }
});

export async function createManualOrder(payload: z.infer<typeof manualOrderSchema>) {
  const session = await requireAdmin();
  try {
    const validated = manualOrderSchema.parse(payload);
    
    // Fetch live menu prices for security
    const menuItemsList = await db.select().from(menuItems);
    const variantsList = await db.select().from(itemVariants);
    const addOnsList = await db.select().from(itemAddOns);
    
    let subtotal = 0;
    const orderItemsToInsert = [];
    
    for (const item of validated.items) {
      const dbItem = menuItemsList.find(m => m.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item not found: ${item.menuItemId}`);
      
      let itemPrice = dbItem.basePrice;
      const itemName = dbItem.name;
      
      let variantName = null;
      if (item.variantId) {
        const dbVariant = variantsList.find(v => v.id === item.variantId);
        if (dbVariant) {
          itemPrice = dbVariant.price;
          variantName = dbVariant.name;
        }
      }
      
      let addOnPriceTotal = 0;
      const selectedAddOnObjects = [];
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        for (const addOnId of item.selectedAddOns) {
          const dbAddOn = addOnsList.find(a => a.id === addOnId);
          if (dbAddOn) {
            addOnPriceTotal += dbAddOn.price;
            selectedAddOnObjects.push({ id: dbAddOn.id, name: dbAddOn.name, price: dbAddOn.price });
          }
        }
      }
      
      const itemSubtotal = (itemPrice + addOnPriceTotal) * item.quantity;
      subtotal += itemSubtotal;
      
      orderItemsToInsert.push({
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        itemName,
        variantName,
        quantity: item.quantity,
        unitPrice: itemPrice,
        selectedAddOns: selectedAddOnObjects.length > 0 ? selectedAddOnObjects : null,
        specialInstructions: item.specialInstructions || null,
        subtotal: itemSubtotal,
        status: "pending" as const,
      });
    }
    
    // Check manual discount limit for managers (now that subtotal is calculated)
    if (session.role === "manager" && validated.discountAmount > 0) {
      const maxDiscountPct = session.permissions.maxDiscountPercentage || 0;
      const calcMaxDiscount = (subtotal * maxDiscountPct) / 100;
      if (validated.discountAmount > calcMaxDiscount) {
        throw new Error(`UNAUTHORIZED: Your discount limit is ${maxDiscountPct}%. Maximum allowed discount for this order is Rs. ${Math.floor(calcMaxDiscount)}.`);
      }
    }

    const totalAmount = Math.max(0, subtotal + validated.deliveryFee - validated.discountAmount);
    
    // Handle Customer
    let customerId = null;
    let finalCustomerName = validated.customerName || "Walk-in Guest";
    let finalCustomerPhone = validated.customerPhone || "00000000000";
    
    if (validated.customerPhone && validated.customerPhone.trim() !== "") {
      const existingCustomer = await db.select().from(users).where(eq(users.phone, validated.customerPhone)).limit(1);
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
        finalCustomerName = existingCustomer[0].name || finalCustomerName;
      } else {
        const [newUser] = await db.insert(users).values({
          name: finalCustomerName,
          phone: validated.customerPhone,
          role: "customer"
        }).returning();
        customerId = newUser.id;
      }
    }
    
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    
    let finalWaiterId = validated.waiterId || null;
    if (!finalWaiterId && session.role === "waiter") {
      finalWaiterId = session.id;
    }

    await db.insert(orders).values({
      id: orderId,
      customerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      orderType: validated.orderType,
      tableNumber: validated.tableNumber || null,
      waiterId: finalWaiterId,
      waiterName: null, // Legacy, can be left null
      deliveryAddress: validated.deliveryAddress || null,
      deliveryNotes: validated.deliveryNotes || null,
      status: "pending",
      source: "admin",
      paymentMethod: validated.paymentMethod,
      paymentStatus: validated.paymentStatus,
      subtotal,
      deliveryFee: validated.deliveryFee,
      discountAmount: validated.discountAmount,
      totalAmount: Math.max(0, totalAmount),
    });
    
    for (const oi of orderItemsToInsert) {
      await db.insert(orderItems).values({
        orderId,
        ...oi,
      });
    }
    
    revalidatePath("/admin/orders");
    return { success: true, orderId };
    
  } catch (error) {
    console.error("Error creating manual order:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create order" };
  }
}

const addItemsSchema = z.object({
  orderId: z.string(),
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(1),
    selectedAddOns: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  })).min(1),
});

export async function addItemsToExistingOrder(data: z.infer<typeof addItemsSchema>) {
  const session = await requireAdmin();
  try {
    const validated = addItemsSchema.parse(data);
    
    const existingOrderArr = await db.select().from(orders).where(eq(orders.id, validated.orderId)).limit(1);
    if (existingOrderArr.length === 0) {
      return { success: false, error: "Order not found" };
    }
    const existingOrder = existingOrderArr[0];
    
    // STRICT EDIT LOCK
    if (session.role === "manager" && ["preparing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(existingOrder.status)) {
      throw new Error("UNAUTHORIZED: Managers cannot edit orders that are already preparing or dispatched.");
    }
    
    const [dbItems, dbVariants, dbAddOns] = await Promise.all([
      db.select().from(menuItems).where(inArray(menuItems.id, validated.items.map(i => i.menuItemId))),
      db.select().from(itemVariants),
      db.select().from(itemAddOns),
    ]);

    let newSubtotal = 0;
    const orderItemsToInsert = [];
    
    for (const item of validated.items) {
      const dbItem = dbItems.find(i => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);
      
      let itemPrice = dbItem.basePrice;
      let itemName = dbItem.name;
      let variantName = null;
      
      if (item.variantId) {
        const dbVariant = dbVariants.find(v => v.id === item.variantId);
        if (dbVariant) {
          itemPrice = dbVariant.price;
          variantName = dbVariant.name;
        }
      }
      
      const selectedAddOnObjects = [];
      let addOnPriceTotal = 0;
      
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        for (const addOnId of item.selectedAddOns) {
          const dbAddOn = dbAddOns.find(a => a.id === addOnId);
          if (dbAddOn) {
            addOnPriceTotal += dbAddOn.price;
            selectedAddOnObjects.push({ id: dbAddOn.id, name: dbAddOn.name, price: dbAddOn.price });
          }
        }
      }
      
      const itemSubtotal = (itemPrice + addOnPriceTotal) * item.quantity;
      newSubtotal += itemSubtotal;
      
      orderItemsToInsert.push({
        orderId: validated.orderId,
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        itemName,
        variantName,
        quantity: item.quantity,
        unitPrice: itemPrice,
        selectedAddOns: selectedAddOnObjects.length > 0 ? selectedAddOnObjects : null,
        specialInstructions: item.specialInstructions || null,
        subtotal: itemSubtotal,
        status: "pending" as const,
      });
    }
    
    for (const oi of orderItemsToInsert) {
      await db.insert(orderItems).values(oi);
    }
    
    await db.update(orders)
      .set({ 
        subtotal: existingOrder.subtotal + newSubtotal,
        totalAmount: existingOrder.totalAmount + newSubtotal,
        updatedAt: new Date()
      })
      .where(eq(orders.id, validated.orderId));
      
    revalidatePath("/admin/orders");
    return { success: true, orderId: validated.orderId };
    
  } catch (error) {
    console.error("Error adding items to order:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add items" };
  }
}

export async function cancelLiveOrder(orderId: string) {
  await requireAdmin();
  try {
    await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return { success: false, error: "Failed to cancel order" };
  }
}

export async function updateTableNumber(orderId: string, tableNumber: string) {
  await requireAdmin();
  try {
    await db.update(orders).set({ tableNumber, updatedAt: new Date() }).where(eq(orders.id, orderId));
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error updating table number:", error);
    return { success: false, error: "Failed to update table number" };
  }
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const session = await requireAdmin();
  try {
    const existingOrderArr = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (existingOrderArr.length === 0) throw new Error("Order not found");
    const order = existingOrderArr[0];

    // STRICT EDIT LOCK
    if (session.role === "manager" && ["preparing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status)) {
      throw new Error("UNAUTHORIZED: Managers cannot remove items from orders that are already preparing or dispatched.");
    }

    const existingItemArr = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    if (existingItemArr.length === 0) throw new Error("Item not found");
    const item = existingItemArr[0];

    if (item.orderId !== orderId) throw new Error("Item does not belong to this order");

    await db.transaction(async (tx) => {
      // Delete the item
      await tx.delete(orderItems).where(eq(orderItems.id, itemId));
      
      // Recalculate order totals
      const newSubtotal = Math.max(0, order.subtotal - item.subtotal);
      const newTotalAmount = Math.max(0, newSubtotal + (order.deliveryFee ?? 0) - (order.discountAmount ?? 0));

      await tx.update(orders)
        .set({ 
          subtotal: newSubtotal,
          totalAmount: newTotalAmount,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    });

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error removing order item:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove item" };
  }
}
