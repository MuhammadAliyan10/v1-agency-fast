"use server";

import { db } from "@/database/db";
import { categories, menuItems } from "@/database/schema";
import { eq, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CategoryFormValues } from "@/lib/validations/category";

export async function getCategoriesWithItemCount() {
  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        itemCount: sql<number>`count(${menuItems.id})::int`,
      })
      .from(categories)
      .leftJoin(menuItems, eq(categories.id, menuItems.categoryId))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}

export async function upsertCategory(data: CategoryFormValues, categoryId?: string) {
  try {
    // Check if slug exists
    const existingSlug = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, data.slug));
      
    if (existingSlug.length > 0 && existingSlug[0].id !== categoryId) {
      return { success: false, error: "A category with this slug already exists. Please choose a different slug." };
    }

    if (categoryId) {
      await db.update(categories)
        .set({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        })
        .where(eq(categories.id, categoryId));
    } else {
      await db.insert(categories)
        .values({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        });
    }

    revalidatePath("/admin/categories");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error upserting category:", error);
    return { success: false, error: "Failed to save category" };
  }
}

export async function toggleCategoryStatus(categoryId: string, isActive: boolean) {
  try {
    await db.update(categories)
      .set({ isActive })
      .where(eq(categories.id, categoryId));
      
    revalidatePath("/admin/categories");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error toggling category status:", error);
    return { success: false, error: "Failed to update category status" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    // Check for linked items
    const linkedItems = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .limit(1);

    if (linkedItems.length > 0) {
      return { success: false, warning: "Cannot delete category with active menu items. Reassign or delete items first." };
    }

    await db.delete(categories).where(eq(categories.id, categoryId));
    
    revalidatePath("/admin/categories");
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}
