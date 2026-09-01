"use server";

import { db } from "@/database/db";
import { menuItems, reviews, categories } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProductDetails(id: string) {
  try {
    const item = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, id),
      with: {
        category: true,
        variants: true,
        addOns: true,
        reviews: {
          orderBy: [desc(reviews.createdAt)],
        },
      },
    });

    if (!item) {
      return { success: false, error: "Product not found" };
    }

    // Fetch recommended items (same category, excluding current item, limit 6)
    const recommendedItems = await db.query.menuItems.findMany({
      where: (menuItems, { and, eq, ne }) => and(
        eq(menuItems.categoryId, item.categoryId),
        ne(menuItems.id, id),
        eq(menuItems.isAvailable, true)
      ),
      limit: 6,
    });

    // Fetch global add-ons
    const addonCategories = await db.query.categories.findMany({
      where: eq(categories.isGlobalAddon, true)
    });
    
    const globalAddons: { categoryId: string; categoryName: string; items: any[] }[] = [];
    
    for (const cat of addonCategories) {
      const items = await db.query.menuItems.findMany({
        where: (menuItems, { and, eq, ne }) => and(
          eq(menuItems.categoryId, cat.id),
          eq(menuItems.isAvailable, true),
          ne(menuItems.id, id)
        ),
        with: {
          variants: true
        }
      });
      if (items.length > 0) {
        globalAddons.push({
          categoryId: cat.id,
          categoryName: cat.name,
          items
        });
      }
    }

    const reviewList = item.reviews || [];
    const averageRating = reviewList.length > 0 
      ? reviewList.reduce((acc, r) => acc + r.rating, 0) / reviewList.length 
      : 0;

    return { 
      success: true, 
      data: {
        ...item,
        averageRating: Number(averageRating.toFixed(1)),
        reviewCount: reviewList.length,
        recommendedItems,
        globalAddons,
      } 
    };
  } catch (error) {
    console.error("Error fetching product details:", error);
    return { success: false, error: "Failed to load product" };
  }
}

export async function submitReview(data: { menuItemId: string; customerName: string; rating: number; comment: string }) {
  try {
    await db.insert(reviews).values({
      menuItemId: data.menuItemId,
      customerName: data.customerName,
      rating: data.rating,
      comment: data.comment,
    });

    revalidatePath(`/product/${data.menuItemId}`);
    return { success: true };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}
