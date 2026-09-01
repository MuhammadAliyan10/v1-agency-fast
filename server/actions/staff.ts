"use server";

import { db } from "@/database/db";
import { users, staffPermissions } from "@/database/schema";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/session";
import { eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "admin" | "manager" | "kitchen" | "waiter" | "rider";
  isActive: boolean | null;
  createdAt: Date | null;
  permissions?: typeof staffPermissions.$inferSelect | null;
};

export async function getStaff() {
  await requireAdmin();
  try {
    const data = await db.query.users.findMany({
      where: inArray(users.role, ["admin", "manager", "kitchen", "waiter", "rider"]),
      with: {
        staffPermissions: true,
      },
    });

    const mapped = data.map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role as StaffMember["role"],
      isActive: u.isActive,
      createdAt: u.createdAt,
      permissions: u.staffPermissions,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return { success: false, error: "Failed to fetch staff." };
  }
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  await requireSuperAdmin();
  try {
    // Increment sessionVersion to instantly revoke access if they are deactivated
    await db.update(users)
      .set({ 
        isActive,
        sessionVersion: sql`${users.sessionVersion} + 1` 
      })
      .where(eq(users.id, userId));
      
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle staff status:", error);
    return { success: false, error: "Failed to update staff member." };
  }
}

export type CreateStaffInput = {
  name: string;
  phone: string;
  email?: string;
  role: "admin" | "manager" | "kitchen" | "waiter" | "rider";
  password?: string;
  permissions?: {
    canManageMenu: boolean;
    canViewFinance: boolean;
    canManageCoupons: boolean;
    canViewInventory: boolean;
    canBroadcastWhatsapp: boolean;
    canManageStaff: boolean;
    maxDiscountPercentage: number;
  };
};

export async function createStaff(data: CreateStaffInput) {
  await requireSuperAdmin();
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.phone, data.phone),
    });

    if (existing) {
      return { success: false, error: "A user with this phone number already exists." };
    }

    let passwordHash = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        role: data.role,
        passwordHash,
        isActive: true,
      }).returning();

      if (data.role === "manager" && data.permissions) {
        await tx.insert(staffPermissions).values({
          userId: newUser.id,
          ...data.permissions,
        });
      }
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to create staff:", error);
    return { success: false, error: "Failed to create staff member." };
  }
}

export async function updateStaffPermissions(userId: string, data: CreateStaffInput) {
  await requireSuperAdmin();
  try {
    await db.transaction(async (tx) => {
      const updatePayload: any = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        role: data.role,
        // Any role or permission change increments the sessionVersion for instant revocation
        sessionVersion: sql`${users.sessionVersion} + 1`,
      };

      if (data.password) {
        updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
      }

      await tx.update(users).set(updatePayload).where(eq(users.id, userId));

      if (data.role === "manager" && data.permissions) {
        const existingPerms = await tx.query.staffPermissions.findFirst({
          where: eq(staffPermissions.userId, userId),
        });

        if (existingPerms) {
          await tx.update(staffPermissions).set({
            ...data.permissions,
            updatedAt: new Date(),
          }).where(eq(staffPermissions.userId, userId));
        } else {
          await tx.insert(staffPermissions).values({
            userId,
            ...data.permissions,
          });
        }
      }
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to update staff:", error);
    return { success: false, error: "Failed to update staff member." };
  }
}
