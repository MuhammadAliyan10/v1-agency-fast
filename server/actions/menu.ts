// server/actions/menu.ts
"use server";

import { db } from "@/database/db";
import { menuItems, itemVariants, itemAddOns, categories } from "@/database/schema";
import { eq, ilike, and, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { MenuItemValues } from "@/lib/validations/menu";
import { requireAdmin } from "@/lib/auth/session";

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MenuStats {
  totalItems:    number;
  availableItems: number;
  featuredItems: number;
  avgBasePrice:  number;
  unavailableItems: number;
}

export interface PaginatedMenuItem {
  id:              string;
  name:            string;
  description:     string | null;
  slug:            string;
  categoryId:      string;
  categoryName:    string | null;
  basePrice:       number;
  imageUrl:        string | null;
  isAvailable:     boolean | null;
  isFeatured:      boolean | null;
  preparationTime: number | null;
  tags: {
    isSpicy?:   boolean;
    isVeg?:     boolean;
    isNew?:     boolean;
    isPopular?: boolean;
  } | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  variants: { id: string; name: string; price: number; isAvailable: boolean | null }[];
  addOns:   { id: string; name: string; price: number; isAvailable: boolean | null }[];
}

// ── Queries ───────────────────────────────────────────────────────────────────
export async function getMenuStats(): Promise<{ success: true; data: MenuStats } | { success: false; error: string }> {
  await requireAdmin();
  try {
    const [row] = await db
      .select({
        totalItems:      sql<number>`COUNT(*)::int`,
        availableItems:  sql<number>`COUNT(CASE WHEN ${menuItems.isAvailable} = true THEN 1 END)::int`,
        featuredItems:   sql<number>`COUNT(CASE WHEN ${menuItems.isFeatured} = true THEN 1 END)::int`,
        avgBasePrice:    sql<number>`COALESCE(AVG(${menuItems.basePrice}), 0)`,
      })
      .from(menuItems);

    return {
      success: true,
      data: {
        totalItems:       Number(row.totalItems),
        availableItems:   Number(row.availableItems),
        featuredItems:    Number(row.featuredItems),
        avgBasePrice:     Math.round(Number(row.avgBasePrice)),
        unavailableItems: Number(row.totalItems) - Number(row.availableItems),
      },
    };
  } catch (error) {
    console.error("Error fetching menu stats:", error);
    return { success: false, error: "Failed to fetch menu stats" };
  }
}

export async function getPaginatedMenu(page = 1, limit = 10, search = "", categoryId = "") {
  await requireAdmin();
  try {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search)                             conditions.push(ilike(menuItems.name, `%${search}%`));
    if (categoryId && categoryId !== "all") conditions.push(eq(menuItems.categoryId, categoryId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuItems)
      .where(whereClause);

    const rows = await db
      .select({ item: menuItems, categoryName: categories.name })
      .from(menuItems)
      .leftJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(menuItems.createdAt));

    const itemIds = rows.map(r => r.item.id);
    const [allVariants, allAddOns] = itemIds.length > 0
      ? await Promise.all([
          db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, itemIds)),
          db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, itemIds)),
        ])
      : [[], []];

    const formattedItems: PaginatedMenuItem[] = rows.map(({ item, categoryName }) => ({
      ...item,
      categoryName,
      variants: allVariants.filter(v => v.menuItemId === item.id),
      addOns:   allAddOns.filter(a => a.menuItemId === item.id),
    }));

    return {
      success: true,
      data: {
        items: formattedItems,
        totalCount,
        totalPages:  Math.ceil(totalCount / limit),
        currentPage: page,
      },
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

    const itemPayload = {
      name:            data.name,
      description:     data.description ?? null,
      categoryId:      data.categoryId,
      basePrice:       data.basePrice,
      imageUrl:        data.imageUrl ?? null,
      isAvailable:     data.isAvailable,
      isFeatured:      data.isFeatured,
      preparationTime: data.preparationTime ?? null,
      tags:            data.tags ?? { isSpicy: false, isVeg: false, isNew: false, isPopular: false },
      updatedAt:       new Date(),
    };

    if (targetItemId) {
      await db.update(menuItems).set(itemPayload).where(eq(menuItems.id, targetItemId));
      await Promise.all([
        db.delete(itemVariants).where(eq(itemVariants.menuItemId, targetItemId)),
        db.delete(itemAddOns).where(eq(itemAddOns.menuItemId, targetItemId)),
      ]);
    } else {
      const [newItem] = await db
        .insert(menuItems)
        .values({ ...itemPayload, slug: `${slug}-${Math.floor(Math.random() * 9000) + 1000}` })
        .returning({ id: menuItems.id });
      targetItemId = newItem.id;
    }

    if (data.variants && data.variants.length > 0 && targetItemId) {
      await db.insert(itemVariants).values(
        data.variants.map(v => ({
          menuItemId:  targetItemId as string,
          name:        v.name,
          price:       v.price,
          isAvailable: v.isAvailable,
        }))
      );
    }

    if (data.addOns && data.addOns.length > 0 && targetItemId) {
      await db.insert(itemAddOns).values(
        data.addOns.map(a => ({
          menuItemId:  targetItemId as string,
          name:        a.name,
          price:       a.price,
          isAvailable: a.isAvailable,
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
    await db.update(menuItems).set({ isAvailable, updatedAt: new Date() }).where(eq(menuItems.id, itemId));
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update availability" };
  }
}

export async function bulkToggleCategoryAvailability(categoryId: string, isAvailable: boolean) {
  await requireAdmin();
  try {
    await db
      .update(menuItems)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(menuItems.categoryId, categoryId));
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Bulk toggle error:", error);
    return { success: false, error: "Failed to bulk update category" };
  }
}

export async function deleteMenuItem(itemId: string) {
  await requireAdmin();
  try {
    await db.delete(menuItems).where(eq(menuItems.id, itemId));
    revalidatePath("/admin/menu");
    return { success: true };
  } catch {
    try {
      await db.update(menuItems).set({ isAvailable: false }).where(eq(menuItems.id, itemId));
      revalidatePath("/admin/menu");
      return {
        success: true,
        warning: "Item is linked to existing orders and was archived instead of deleted.",
      };
    } catch {
      return { success: false, error: "Failed to delete or archive menu item." };
    }
  }
}

export async function updateMenuItemPrice(itemId: string, newPrice: number) {
  await requireAdmin();
  if (isNaN(newPrice) || newPrice < 0) return { success: false, error: "Invalid price value." };
  try {
    await db.update(menuItems).set({ basePrice: newPrice, updatedAt: new Date() }).where(eq(menuItems.id, itemId));
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update price." };
  }
}

export async function getCategories() {
  await requireAdmin();
  try {
    const data = await db.select().from(categories).orderBy(categories.name);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to fetch categories" };
  }
}

// ── POS Specialized ───────────────────────────────────────────────────────────
export async function getPOSMenuData() {
  await requireAdmin();
  try {
    const allCategories = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
    const allItems      = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));

    const itemIds = allItems.map(i => i.id);
    const [variants, addOns] = itemIds.length > 0
      ? await Promise.all([
          db.select().from(itemVariants).where(and(inArray(itemVariants.menuItemId, itemIds), eq(itemVariants.isAvailable, true))),
          db.select().from(itemAddOns).where(and(inArray(itemAddOns.menuItemId, itemIds), eq(itemAddOns.isAvailable, true))),
        ])
      : [[], []];

    return { success: true, data: { categories: allCategories, items: allItems, variants, addOns } };
  } catch (error) {
    console.error("Error fetching POS menu data:", error);
    return { success: false, error: "Failed to fetch POS menu data" };
  }
}
