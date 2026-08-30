"use server";

import { db } from "@/database/db";
import { coupons } from "@/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CouponValidationResult {
  valid: boolean;
  discountType?: "flat" | "percent";
  discountValue?: number;
  applicableItemIds?: string[] | null;
  message?: string;
}

/**
 * Validates a coupon code against the DB and returns discount metadata.
 * Per-item scope: if applicableItemIds is set, discount only applies to those items.
 */
export async function validateCoupon(
  code: string,
  orderTotal: number
): Promise<CouponValidationResult> {
  try {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase().trim()),
    });

    if (!coupon) return { valid: false, message: "Invalid coupon code" };
    if (!coupon.isActive) return { valid: false, message: "This coupon is no longer active" };

    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now)
      return { valid: false, message: "This coupon is not yet valid" };
    if (coupon.validUntil && coupon.validUntil < now)
      return { valid: false, message: "This coupon has expired" };

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      return { valid: false, message: "This coupon has reached its usage limit" };

    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount)
      return {
        valid: false,
        message: `Minimum order of Rs. ${coupon.minOrderAmount} required`,
      };

    return {
      valid: true,
      discountType: coupon.discountType as "flat" | "percent",
      discountValue: coupon.discountValue,
      applicableItemIds: coupon.applicableItemIds as string[] | null,
    };
  } catch (error) {
    console.error("Coupon validation error:", error);
    return { valid: false, message: "Failed to validate coupon" };
  }
}

/**
 * Calculates the total discount for an order given a coupon.
 * Per-item scope: applies discount per qualifying item subtotal.
 */
export async function calculateCouponDiscount(
  coupon: CouponValidationResult,
  cartItems: { menuItemId: string; subtotal: number }[]
): Promise<number> {
  if (!coupon.valid) return 0;

  const eligibleItems = coupon.applicableItemIds
    ? cartItems.filter((i) => coupon.applicableItemIds!.includes(i.menuItemId))
    : cartItems;

  const eligibleSubtotal = eligibleItems.reduce((s, i) => s + i.subtotal, 0);

  if (coupon.discountType === "flat") {
    return Math.min(coupon.discountValue!, eligibleSubtotal);
  } else {
    return Math.floor((eligibleSubtotal * coupon.discountValue!) / 100);
  }
}

/** Increments coupon usedCount after successful order */
export async function incrementCouponUsage(code: string) {
  try {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase().trim()),
    });
    if (!coupon) return;
    await db
      .update(coupons)
      .set({ usedCount: coupon.usedCount + 1 })
      .where(eq(coupons.id, coupon.id));
  } catch (error) {
    console.error("Failed to increment coupon usage:", error);
  }
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function listCoupons() {
  try {
    const data = await db.query.coupons.findMany({
      orderBy: (coupons, { desc }) => [desc(coupons.createdAt)],
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error listing coupons:", error);
    return { success: false, error: "Failed to list coupons" };
  }
}

export async function createCoupon(data: {
  code: string;
  description?: string;
  discountType: "flat" | "percent";
  discountValue: number;
  applicableItemIds?: string[];
  minOrderAmount?: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}) {
  try {
    const result = await db
      .insert(coupons)
      .values({
        ...data,
        code: data.code.toUpperCase().trim(),
        isActive: data.isActive ?? true,
      })
      .returning();
    revalidatePath("/admin/coupons");
    return { success: true, data: result[0] };
  } catch (error: any) {
    if (error?.message?.includes("unique")) {
      return { success: false, error: "A coupon with this code already exists" };
    }
    console.error("Error creating coupon:", error);
    return { success: false, error: "Failed to create coupon" };
  }
}

export async function updateCoupon(
  id: string,
  data: Partial<{
    code: string;
    description: string;
    discountType: "flat" | "percent";
    discountValue: number;
    applicableItemIds: string[];
    minOrderAmount: number;
    maxUses: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
  }>
) {
  try {
    const result = await db
      .update(coupons)
      .set({ ...data, code: data.code?.toUpperCase().trim() })
      .where(eq(coupons.id, id))
      .returning();
    revalidatePath("/admin/coupons");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating coupon:", error);
    return { success: false, error: "Failed to update coupon" };
  }
}

export async function deleteCoupon(id: string) {
  try {
    await db.delete(coupons).where(eq(coupons.id, id));
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return { success: false, error: "Failed to delete coupon" };
  }
}
