"use server";

import { db } from "@/database/db";
import { deals, dealSlots } from "@/database/schema";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPublicDeals() {
  try {
    const now = new Date();
    const activeDeals = await db.query.deals.findMany({
      where: and(
        eq(deals.isActive, true),
        eq(deals.isArchived, false),
        or(isNull(deals.validUntil), gte(deals.validUntil, now))
      ),
      with: {
        slots: {
          with: {
            menuItem: true,
            category: true,
          }
        }
      },
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
      where: eq(deals.isArchived, false),
      with: {
        slots: {
          with: {
            menuItem: true,
            category: true,
          }
        }
      },
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
  slots: { slotName: string; quantity: number; menuItemId?: string; categoryId?: string; requiredVariantName?: string }[];
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}) {
  try {
    const result = await db.transaction(async (tx) => {
      const [newDeal] = await tx
        .insert(deals)
        .values({
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          dealType: data.dealType,
          eventLabel: data.eventLabel,
          originalPrice: data.originalPrice,
          dealPrice: data.dealPrice,
          validFrom: data.validFrom,
          validUntil: data.validUntil,
          isActive: data.isActive ?? true,
        })
        .returning();

      if (data.slots && data.slots.length > 0) {
        await tx.insert(dealSlots).values(
          data.slots.map(slot => ({
            dealId: newDeal.id,
            slotName: slot.slotName,
            quantity: slot.quantity,
            menuItemId: slot.menuItemId || null,
            categoryId: slot.categoryId || null,
            requiredVariantName: slot.requiredVariantName || null,
          }))
        );
      }

      return newDeal;
    });

    revalidatePath("/admin/deals");
    return { success: true, data: result };
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
    slots: { slotName: string; quantity: number; menuItemId?: string; categoryId?: string; requiredVariantName?: string }[];
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
  }>
) {
  try {
    const result = await db.transaction(async (tx) => {
      const { slots, ...dealData } = data;
      
      const [updatedDeal] = await tx
        .update(deals)
        .set({ ...dealData, updatedAt: new Date() })
        .where(eq(deals.id, id))
        .returning();

      if (slots !== undefined) {
        // Replace all slots
        await tx.delete(dealSlots).where(eq(dealSlots.dealId, id));
        if (slots.length > 0) {
          await tx.insert(dealSlots).values(
            slots.map(slot => ({
              dealId: id,
              slotName: slot.slotName,
              quantity: slot.quantity,
              menuItemId: slot.menuItemId || null,
              categoryId: slot.categoryId || null,
              requiredVariantName: slot.requiredVariantName || null,
            }))
          );
        }
      }

      return updatedDeal;
    });

    revalidatePath("/admin/deals");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating deal:", error);
    return { success: false, error: "Failed to update deal" };
  }
}

export async function deleteDeal(id: string) {
  try {
    // Soft Delete
    await db.update(deals).set({ isArchived: true, isActive: false }).where(eq(deals.id, id));
    revalidatePath("/admin/deals");
    return { success: true };
  } catch (error) {
    console.error("Error deleting deal:", error);
    return { success: false, error: "Failed to delete deal" };
  }
}
