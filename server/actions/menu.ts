"use server";

import { db } from "@/database/db";
import { menuItems, itemVariants, itemAddOns, categories } from "@/database/schema";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { MenuItemValues } from "@/lib/validations/menu";
import { requireAdmin } from "@/lib/auth/session";

// Generate slug from name
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export async function getPaginatedMenu(page = 1, limit = 10, search = "", categoryId = "") {
  await requireAdmin();
  try {
    const offset = (page - 1) * limit;
    
    // Build conditions
    const conditions = [];
    if (search) {
      conditions.push(ilike(menuItems.name, `%${search}%`));
    }
    if (categoryId && categoryId !== "all") {
      conditions.push(eq(menuItems.categoryId, categoryId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuItems)
      .where(whereClause);
      
    const totalCount = countResult[0]?.count || 0;

    // Get paginated items
    const items = await db
      .select({
        item: menuItems,
        categoryName: categories.name,
      })
      .from(menuItems)
      .leftJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(menuItems.createdAt));

    // For full details (variants/addons), we need separate queries if we want them all,
    // but typically for the table we only need the basic info. 
    // We will fetch full details on demand when editing, or we can fetch them here.
    const itemIds = items.map(i => i.item.id);
    
    let allVariants: any[] = [];
    let allAddOns: any[] = [];
    
    if (itemIds.length > 0) {
      allVariants = await db.select().from(itemVariants).where(sql`${itemVariants.menuItemId} IN ${itemIds}`);
      allAddOns = await db.select().from(itemAddOns).where(sql`${itemAddOns.menuItemId} IN ${itemIds}`);
    }

    const formattedItems = items.map(({ item, categoryName }) => ({
      ...item,
      categoryName,
      variants: allVariants.filter(v => v.menuItemId === item.id),
      addOns: allAddOns.filter(a => a.menuItemId === item.id),
    }));

    return {
      success: true,
      data: {
        items: formattedItems,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      }
    };
  } catch (error) {
    console.error("Error fetching menu:", error);
    return { success: false, error: "Failed to fetch menu items" };
  }
}

export async function upsertMenuItem(data: MenuItemValues, itemId?: string) {
  await requireAdmin();
  try {
    const slug = slugify(data.name);

    let targetItemId = itemId;

    if (targetItemId) {
      // UPDATE
      await db.update(menuItems)
        .set({
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId,
          basePrice: data.basePrice,
          imageUrl: data.imageUrl || null,
          isAvailable: data.isAvailable,
          isFeatured: data.isFeatured,
          updatedAt: new Date(),
        })
        .where(eq(menuItems.id, targetItemId));

      // Delete existing variants and addons to replace them
      await db.delete(itemVariants).where(eq(itemVariants.menuItemId, targetItemId));
      await db.delete(itemAddOns).where(eq(itemAddOns.menuItemId, targetItemId));
    } else {
      // INSERT
      const slugWithRandom = `${slug}-${Math.floor(Math.random() * 1000)}`;
      
      const [newItem] = await db.insert(menuItems)
        .values({
          name: data.name,
          slug: slugWithRandom,
          description: data.description || null,
          categoryId: data.categoryId,
          basePrice: data.basePrice,
          imageUrl: data.imageUrl || null,
          isAvailable: data.isAvailable,
          isFeatured: data.isFeatured,
        })
        .returning({ id: menuItems.id });
        
      targetItemId = newItem.id;
    }

    // Re-insert variants
    if (data.variants && data.variants.length > 0 && targetItemId) {
      await db.insert(itemVariants).values(
        data.variants.map(v => ({
          menuItemId: targetItemId as string,
          name: v.name,
          price: v.price,
        }))
      );
    }

    // Re-insert add-ons
    if (data.addOns && data.addOns.length > 0 && targetItemId) {
      await db.insert(itemAddOns).values(
        data.addOns.map(a => ({
          menuItemId: targetItemId as string,
          name: a.name,
          price: a.price,
        }))
      );
    }

    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error upserting menu item:", error);
    return { success: false, error: "Failed to save menu item" };
  }
}

export async function toggleItemAvailability(itemId: string, isAvailable: boolean) {
  await requireAdmin();
  try {
    await db.update(menuItems)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(menuItems.id, itemId));
      
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error toggling availability:", error);
    return { success: false, error: "Failed to update availability" };
  }
}

export async function deleteMenuItem(itemId: string) {
  await requireAdmin();
  try {
    // Hard delete (cascade will handle variants/addons if set in schema, otherwise manual)
    await db.delete(menuItems).where(eq(menuItems.id, itemId));
    
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu item:", error);
    // If it fails, it might be due to order_items foreign key constraints (restrict).
    // In that case, we should soft delete (isAvailable = false)
    try {
      await db.update(menuItems)
        .set({ isAvailable: false })
        .where(eq(menuItems.id, itemId));
      revalidatePath("/admin/menu");
      return { success: true, warning: "Item could not be hard deleted because it is linked to existing orders. It has been marked as unavailable instead." };
    } catch (fallbackError) {
      return { success: false, error: "Failed to delete or archive menu item." };
    }
  }
}

export async function updateMenuItemPrice(itemId: string, newPrice: number) {
  await requireAdmin();
  if (isNaN(newPrice) || newPrice < 0) {
    return { success: false, error: "Invalid price value." };
  }
  try {
    await db.update(menuItems)
      .set({ basePrice: newPrice, updatedAt: new Date() })
      .where(eq(menuItems.id, itemId));
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error updating price:", error);
    return { success: false, error: "Failed to update price." };
  }
}

export async function getCategories() {
  await requireAdmin();
  try {
    const data = await db.select().from(categories).orderBy(categories.name);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Failed to fetch categories" };
  }
}

// -----------------------------------------------------------------------------
// POS Specialized Queries
// -----------------------------------------------------------------------------
export async function getPOSMenuData() {
  await requireAdmin();
  try {
    const allCategories = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    
    // Fetch all variants and addons for available items
    const itemIds = allItems.map(i => i.id);
    let variants: any[] = [];
    let addOns: any[] = [];
    
    if (itemIds.length > 0) {
      variants = await db.select().from(itemVariants).where(and(sql`${itemVariants.menuItemId} IN ${itemIds}`, eq(itemVariants.isAvailable, true)));
      addOns = await db.select().from(itemAddOns).where(and(sql`${itemAddOns.menuItemId} IN ${itemIds}`, eq(itemAddOns.isAvailable, true)));
    }

    return {
      success: true,
      data: {
        categories: allCategories,
        items: allItems,
        variants,
        addOns
      }
    };
  } catch (error) {
    console.error("Error fetching POS menu data:", error);
    return { success: false, error: "Failed to fetch POS menu data" };
  }
}
