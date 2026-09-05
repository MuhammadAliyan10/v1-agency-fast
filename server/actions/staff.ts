"use server";

import { db } from "@/database/db";
import { users, staffPermissions } from "@/database/schema";
import { requireAdmin, requireManagerPermission } from "@/lib/auth/session";
import { eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { DEFAULT_RBAC_MATRIX, RBACMatrixSchema } from "@/lib/auth/rbac";

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  role: "admin" | "manager" | "kitchen" | "waiter" | "rider";
  isActive: boolean | null;
  createdAt: Date | null;
  permissions?: typeof staffPermissions.$inferSelect | null;
};

export async function getStaff() {
  // Both admin and managers with staff:read can list staff
  const session = await requireAdmin();
  if (session.role === "manager") {
    const { hasPermission } = await import("@/lib/auth/rbac");
    if (!hasPermission(session, "staff", "read")) {
      throw new Error("UNAUTHORIZED: Missing staff:read permission.");
    }
  }
  try {
    const data = await db.query.users.findMany({
      where: inArray(users.role, ["admin", "manager", "kitchen", "waiter", "rider"]),
      with: { staffPermissions: true },
    });

    return {
      success: true,
      data: data.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        age: u.age,
        role: u.role as StaffMember["role"],
        isActive: u.isActive,
        createdAt: u.createdAt,
        permissions: u.staffPermissions,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return { success: false, error: "Failed to fetch staff." };
  }
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  const session = await requireManagerPermission("staff", "update");
  try {
    // Prevent deactivating an admin account — only another admin can do this,
    // and only super-admin (admin) role at that.
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin" && session.role !== "admin") {
      return { success: false, error: "Only an admin can deactivate another admin account." };
    }
    // Prevent self-lockout
    if (target.id === session.id && !isActive) {
      return { success: false, error: "You cannot deactivate your own account." };
    }

    await db.update(users)
      .set({
        isActive,
        // Increment sessionVersion → any existing JWT for this user is instantly invalidated
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId));

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle staff status:", error);
    return { success: false, error: "Failed to update status." };
  }
}

export type CreateStaffInput = {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  role: "admin" | "manager" | "kitchen" | "waiter" | "rider";
  password?: string;
  // Flat structure: permissions matrix + discount cap live at the same level
  permissions?: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }>;
  maxDiscountPercentage?: number;
};

export async function createStaff(data: CreateStaffInput) {
  const session = await requireManagerPermission("staff", "create");
  // Only admins can create new admins or assign permissions
  if (data.role === "admin" && session.role !== "admin") {
    return { success: false, error: "Only an admin can create another admin account." };
  }

  try {
    // Pre-check for both phone and email
    const [byPhone, byEmail] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.phone, data.phone) }),
      data.email ? db.query.users.findFirst({ where: eq(users.email, data.email) }) : Promise.resolve(null),
    ]);
    if (byPhone) return { success: false, error: "A user with this phone number already exists." };
    if (byEmail) return { success: false, error: "A user with this email address already exists." };

    let passwordHash: string | null = null;
    if (data.password) passwordHash = await bcrypt.hash(data.password, 10);

    await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        age: data.age || null,
        role: data.role,
        passwordHash,
        isActive: true,
      }).returning();

      // Only admin can configure manager permissions
      if (data.role === "manager" && session.role === "admin") {
        const parsedMatrix = RBACMatrixSchema.catch(DEFAULT_RBAC_MATRIX).parse(data.permissions ?? {});
        await tx.insert(staffPermissions).values({
          userId: newUser.id,
          permissions: parsedMatrix,
          maxDiscountPercentage: data.maxDiscountPercentage ?? 0,
        });
      }
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create staff:", error);
    const isDupe = error?.code === "23505" || error?.cause?.code === "23505" || error?.message?.includes("duplicate key");
    if (isDupe) {
      const detail: string = error?.detail ?? error?.cause?.detail ?? "";
      if (detail.includes("email")) return { success: false, error: "A user with this email address already exists." };
      return { success: false, error: "A user with this phone or email already exists." };
    }
    return { success: false, error: "Failed to create staff member." };
  }
}

export async function updateStaffPermissions(userId: string, data: CreateStaffInput) {
  const session = await requireManagerPermission("staff", "update");
  // Only admins can promote to or modify another admin
  if (data.role === "admin" && session.role !== "admin") {
    return { success: false, error: "Only an admin can assign the Admin role." };
  }

  try {
    await db.transaction(async (tx) => {
      const updatePayload: Record<string, any> = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        age: data.age || null,
        role: data.role,
        // Any profile or role change immediately invalidates the user's existing JWT
        sessionVersion: sql`${users.sessionVersion} + 1`,
      };
      if (data.password) updatePayload.passwordHash = await bcrypt.hash(data.password, 10);

      await tx.update(users).set(updatePayload).where(eq(users.id, userId));

      if (data.role === "manager" && session.role === "admin") {
        // Upsert permissions for manager role
        const parsedMatrix = RBACMatrixSchema.catch(DEFAULT_RBAC_MATRIX).parse(data.permissions ?? {});
        const existing = await tx.query.staffPermissions.findFirst({
          where: eq(staffPermissions.userId, userId),
        });

        if (existing) {
          await tx.update(staffPermissions).set({
            permissions: parsedMatrix,
            maxDiscountPercentage: data.maxDiscountPercentage ?? 0,
            updatedAt: new Date(),
          }).where(eq(staffPermissions.userId, userId));
        } else {
          await tx.insert(staffPermissions).values({
            userId,
            permissions: parsedMatrix,
            maxDiscountPercentage: data.maxDiscountPercentage ?? 0,
          });
        }
      } else if (data.role !== "manager") {
        // Role changed away from manager — remove stale permissions row so
        // the user has no residual elevated access in the DB.
        await tx.delete(staffPermissions).where(eq(staffPermissions.userId, userId));
      }
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update staff:", error);
    const isDupe = error?.code === "23505" || error?.cause?.code === "23505" || error?.message?.includes("duplicate key");
    if (isDupe) {
      const detail: string = error?.detail ?? error?.cause?.detail ?? "";
      if (detail.includes("email")) return { success: false, error: "A user with this email address already exists." };
      return { success: false, error: "A user with this phone or email already exists." };
    }
    return { success: false, error: "Failed to update staff member." };
  }
}
