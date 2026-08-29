"use server";

import { db } from "@/database/db";
import { menuItems, categories, orders, orderItems } from "@/database/schema";
import { eq, asc } from "drizzle-orm";

import { unstable_cache } from "next/cache";

const getCachedMenu = unstable_cache(
  async () => {
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
      const allVariants: any[] = [];
      const allAddOns: any[] = [];
      
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
  },
  ["public-menu"],
  { tags: ["public-menu"], revalidate: 60 }
);

export async function getPublicMenu() {
  return await getCachedMenu();
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

export async function getOrderDetails(orderId: string) {
  try {
    const orderData = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
      }
    });

    if (!orderData) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: orderData };
  } catch (error) {
    console.error("Error fetching order details:", error);
    return { success: false, error: "Failed to fetch order details" };
  }
}

export async function cancelOrder(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { status: true }
    });

    if (!order) return { success: false, error: "Order not found" };
    
    // Only allow cancellation if pending
    if (order.status !== "pending") {
      return { success: false, error: "Order can no longer be cancelled because it is " + order.status };
    }

    await db.update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, orderId));

    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return { success: false, error: "Failed to cancel order" };
  }
}
