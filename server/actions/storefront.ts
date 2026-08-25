"use server";

import { db } from "@/database/db";
import { menuItems, categories, orders, orderItems } from "@/database/schema";
import { eq, asc } from "drizzle-orm";

export async function getPublicMenu() {
  try {
    // 1. Fetch active categories
    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));

    if (activeCategories.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Fetch available menu items
    const availableItems = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isAvailable, true))
      .orderBy(asc(menuItems.name));

    if (availableItems.length === 0) {
      // Return categories with empty items array
      return { 
        success: true, 
        data: activeCategories.map(c => ({ ...c, items: [] })) 
      };
    }

    const itemIds = availableItems.map((i) => i.id);

    // 3. Fetch all related variants and add-ons
    const allVariants = [];
    const allAddOns = [];
    
    // Chunking to avoid massive IN clauses if menu is huge
    const chunkSize = 50;
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      
      const v = await db.query.itemVariants.findMany({
        where: (variants, { inArray }) => inArray(variants.menuItemId, chunk)
      });
      allVariants.push(...v);
      
      const a = await db.query.itemAddOns.findMany({
        where: (addons, { inArray }) => inArray(addons.menuItemId, chunk)
      });
      allAddOns.push(...a);
    }

    // 4. Map everything together grouped by category
    const formattedCategories = activeCategories.map(category => {
      // Find items for this category
      const catItems = availableItems.filter(item => item.categoryId === category.id);
      
      // Attach variants and addons to each item
      const populatedItems = catItems.map(item => ({
        ...item,
        variants: allVariants.filter(v => v.menuItemId === item.id),
        addOns: allAddOns.filter(a => a.menuItemId === item.id),
      }));

      return {
        ...category,
        items: populatedItems
      };
    });

    return {
      success: true,
      data: formattedCategories,
    };
  } catch (error) {
    console.error("Error fetching public menu:", error);
    return { success: false, error: "Failed to load menu" };
  }
}

interface OrderPayload {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  paymentMethod: "COD" | "JazzCash" | "EasyPaisa";
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  items: Array<{
    menuItemId: string;
    itemName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    selectedAddOns?: any;
  }>;
}

export async function createOrder(payload: OrderPayload) {
  try {
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    await db.transaction(async (tx) => {
      // 1. Insert order
      await tx.insert(orders).values({
        id: orderId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        deliveryAddress: payload.deliveryAddress,
        deliveryNotes: payload.deliveryNotes || null,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentMethod === "COD" ? "unpaid" : "pending",
        status: "pending",
        subtotal: payload.subtotal,
        deliveryFee: payload.deliveryFee,
        discountAmount: 0,
        totalAmount: payload.totalAmount,
      });

      // 2. Insert order items
      if (payload.items && payload.items.length > 0) {
        await tx.insert(orderItems).values(
          payload.items.map((item) => ({
            orderId,
            menuItemId: item.menuItemId,
            variantId: item.variantId || null,
            itemName: item.itemName,
            variantName: item.variantName || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            selectedAddOns: item.selectedAddOns || null,
          }))
        );
      }
    });

    return { success: true, orderId };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to place order" };
  }
}

export async function getOrderStatus(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        id: true,
        status: true,
        customerName: true,
        totalAmount: true,
        createdAt: true,
      }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching order status:", error);
    return { success: false, error: "Failed to fetch order status" };
  }
}
