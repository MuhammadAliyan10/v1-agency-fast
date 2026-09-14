"use server";

import { db } from "@/database/db";
import { categories } from "@/database/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const getCrossSellDrinks = async (itemCategoryId?: string) => {
  // We use unstable_cache dynamically based on categoryId
  return getCachedCrossSellDrinks(itemCategoryId || "default");
};

const getCachedCrossSellDrinks = unstable_cache(
  async (categoryId: string) => {
    try {
      const allCats = await db.select().from(categories).where(eq(categories.isActive, true));
      
      // If a category ID was passed, check if it's one of the excluded types (drinks, cakes, ice cream)
      if (categoryId !== "default") {
        const itemCat = allCats.find(c => c.id === categoryId);
        if (itemCat) {
          const name = itemCat.name.toLowerCase();
          if (
            name.includes("drink") || 
            name.includes("beverage") || 
            name.includes("ice cream") || 
            name.includes("cake") || 
            name.includes("dessert") || 
            name.includes("sweet")
          ) {
            return { success: true, data: [] };
          }
        }
      }

      const drinksCategory = allCats.find(c => c.name.toLowerCase().includes("drink") || c.name.toLowerCase().includes("beverage"));
      
      if (!drinksCategory) {
        return { success: true, data: [] };
      }

      // Fetch items in the drinks category, including their variants
      const drinks = await db.query.menuItems.findMany({
        where: (menuItems, { eq, and }) => and(
          eq(menuItems.categoryId, drinksCategory.id),
          eq(menuItems.isAvailable, true)
        ),
        with: {
          variants: {
            where: (variants, { eq }) => eq(variants.isAvailable, true)
          }
        },
        orderBy: (menuItems, { asc }) => asc(menuItems.name),
        limit: 10
      });

      return { success: true, data: drinks };
    } catch (error) {
      console.error("Failed to fetch cross-sell drinks:", error);
      return { success: false, data: [] };
    }
  },
  ["cross-sell-drinks-cache-v3"]
);
