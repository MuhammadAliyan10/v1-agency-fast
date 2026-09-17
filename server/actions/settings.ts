"use server";

import { db } from "@/database/db";
import { storeSettings } from "@/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag, unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";

const _getStoreStatus = unstable_cache(
  async () => {
    try {
      const setting = await db.query.storeSettings.findFirst({
        where: eq(storeSettings.key, "is_store_open"),
      });
      if (!setting) return true;
      return setting.value === "true";
    } catch (error) {
      console.error("Failed to get store status:", error);
      return true; // Fail open
    }
  },
  ["store-status"],
  { revalidate: 30, tags: ["store-status"] }
);

export async function getStoreStatus() {
  return _getStoreStatus();
}

export async function toggleStoreStatus(isOpen: boolean) {
  try {
    const existing = await db.query.storeSettings.findFirst({
      where: eq(storeSettings.key, "is_store_open"),
    });

    if (existing) {
      await db.update(storeSettings)
        .set({ value: isOpen.toString(), updatedAt: new Date() })
        .where(eq(storeSettings.key, "is_store_open"));
    } else {
      await db.insert(storeSettings).values({
        key: "is_store_open",
        value: isOpen.toString(),
      });
    }

    // Invalidate the store-status cache so the storefront reflects the change immediately
    updateTag("store-status");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Failed to toggle store status:", error);
    return { success: false, error: "Failed to update store status." };
  }
}

export async function getAllSettings() {
  try {
    const settings = await db.query.storeSettings.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    return { success: true, data: settingsMap };
  } catch (error) {
    console.error("Failed to get all settings:", error);
    return { success: false, error: "Failed to load settings." };
  }
}

export async function bulkUpdateSettings(updates: Record<string, string>) {
  await requireAdmin();
  try {
    const promises = Object.entries(updates).map(async ([key, value]) => {
      const existing = await db.query.storeSettings.findFirst({
        where: eq(storeSettings.key, key),
      });

      if (existing) {
        return db.update(storeSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(storeSettings.key, key));
      } else {
        return db.insert(storeSettings).values({
          key,
          value,
        });
      }
    });

    await Promise.all(promises);
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to bulk update settings:", error);
    return { success: false, error: "Failed to update settings." };
  }
}
