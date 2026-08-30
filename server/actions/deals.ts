"use server";

import { db } from "@/database/db";
import { deals } from "@/database/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPublicDeals() {
  try {
    const now = new Date();
    const activeDeals = await db.query.deals.findMany({
      where: and(
        eq(deals.isActive, true),
        or(isNull(deals.validUntil), gte(deals.validUntil, now))
      ),
      orderBy: (deals, { desc }) => [desc(deals.createdAt)],
    });
    return { success: true, data: activeDeals };
  } catch (error) {
    console.error("Error fetching public deals:", error);
    return { success: false, error: "Failed to load deals" };
  }
}

export async function getAllDeals() {
  try {
    const allDeals = await db.query.deals.findMany({
      orderBy: (deals, { desc }) => [desc(deals.createdAt)],
    });
    return { success: true, data: allDeals };
  } catch (error) {
    console.error("Error fetching deals:", error);
    return { success: false, error: "Failed to fetch deals" };
  }
}

export async function createDeal(data: {
  name: string;
  description?: string;
  imageUrl?: string;
  dealType: "combo" | "event";
  eventLabel?: string;
  originalPrice: number;
  dealPrice: number;
  items: { menuItemId: string; quantity: number; variantId?: string; itemName: string; unitPrice: number }[];
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}) {
  try {
    const result = await db
      .insert(deals)
      .values({
        ...data,
        isActive: data.isActive ?? true,
      })
      .returning();
    revalidatePath("/admin/deals");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error creating deal:", error);
    return { success: false, error: "Failed to create deal" };
  }
}

export async function updateDeal(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    dealType: "combo" | "event";
    eventLabel: string;
    originalPrice: number;
    dealPrice: number;
    items: { menuItemId: string; quantity: number; variantId?: string; itemName: string; unitPrice: number }[];
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
  }>
) {
  try {
    const result = await db
      .update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    revalidatePath("/admin/deals");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating deal:", error);
    return { success: false, error: "Failed to update deal" };
  }
}

export async function deleteDeal(id: string) {
  try {
    await db.delete(deals).where(eq(deals.id, id));
    revalidatePath("/admin/deals");
    return { success: true };
  } catch (error) {
    console.error("Error deleting deal:", error);
    return { success: false, error: "Failed to delete deal" };
  }
}
