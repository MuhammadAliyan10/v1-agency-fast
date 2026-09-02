"use server";

import { db } from "@/database/db";
import { inventoryItems } from "@/database/schema";
import { eq, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { InventoryItemFormValues, StockAdjustmentFormValues } from "@/lib/validations/inventory";
import { requireManagerPermission } from "@/lib/auth/session";

export async function getInventoryItems() {
  await requireManagerPermission("inventory", "read");
  try {
    const data = await db
      .select()
      .from(inventoryItems)
      .orderBy(asc(inventoryItems.itemName));
      
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return { success: false, error: "Failed to fetch inventory items" };
  }
}

export async function upsertInventoryItem(data: InventoryItemFormValues, itemId?: string) {
  await requireManagerPermission("inventory", "read");
  try {
    if (itemId) {
      await db.update(inventoryItems)
        .set({
          itemName: data.itemName,
          unit: data.unit,
          lowStockThreshold: data.lowStockThreshold,
          sku: data.sku || null,
          costPerUnit: data.costPerUnit || 0,
          supplierName: data.supplierName || null,
        })
        .where(eq(inventoryItems.id, itemId));
    } else {
      await db.insert(inventoryItems)
        .values({
          itemName: data.itemName,
          unit: data.unit,
          lowStockThreshold: data.lowStockThreshold,
          stockQuantity: data.stockQuantity || 0,
          sku: data.sku || null,
          costPerUnit: data.costPerUnit || 0,
          supplierName: data.supplierName || null,
        });
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error upserting inventory item:", error);
    return { success: false, error: "Failed to save inventory item" };
  }
}

export async function adjustStockQuantity(data: StockAdjustmentFormValues) {
  await requireManagerPermission("inventory", "read");
  try {
    let updateSql;
    
    if (data.adjustmentType === "add") {
      updateSql = sql`${inventoryItems.stockQuantity} + ${data.quantity}`;
    } else if (data.adjustmentType === "subtract") {
      updateSql = sql`GREATEST(0, ${inventoryItems.stockQuantity} - ${data.quantity})`;
    } else if (data.adjustmentType === "set") {
      updateSql = sql`${data.quantity}`;
    }

    if (updateSql) {
      await db.update(inventoryItems)
        .set({ stockQuantity: updateSql })
        .where(eq(inventoryItems.id, data.inventoryItemId));
        
      // Optionally log notes here if you add an audit_log table
      // if (data.notes) { ... }
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error adjusting stock quantity:", error);
    return { success: false, error: "Failed to adjust stock" };
  }
}

export async function deleteInventoryItem(itemId: string) {
  await requireManagerPermission("inventory", "read");
  try {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
    
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: "Failed to delete inventory item" };
  }
}
