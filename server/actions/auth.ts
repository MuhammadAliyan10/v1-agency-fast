// server/actions/auth.ts
"use server";

import { db } from "@/database/db";
import { eq } from "drizzle-orm";
import { users, staffPermissions } from "@/database/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession, PORTAL_ROUTES, type UserRole, type SessionPayload } from "@/lib/auth/session";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const STAFF_ROLES: UserRole[] = ["admin", "manager", "kitchen", "waiter", "rider"];

const DEFAULT_PERMISSIONS: SessionPayload["permissions"] = {
  canManageMenu:        false,
  canViewFinance:       false,
  canManageCoupons:     false,
  canViewInventory:     false,
  canBroadcastWhatsapp: false,
  canManageStaff:       false,
  maxDiscountPercentage: 0,
};

const ADMIN_PERMISSIONS: SessionPayload["permissions"] = {
  canManageMenu:        true,
  canViewFinance:       true,
  canManageCoupons:     true,
  canViewInventory:     true,
  canBroadcastWhatsapp: true,
  canManageStaff:       true,
  maxDiscountPercentage: 100,
};

export async function loginStaff(
  data: LoginInput
): Promise<{ success: true; redirectTo: string } | { error: string }> {
  try {
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid input fields." };

    const { email, password } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return { error: "Invalid credentials or account is inactive." };
    }

    if (!STAFF_ROLES.includes(user.role as UserRole)) {
      return { error: "This account does not have portal access." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return { error: "Invalid credentials or account is inactive." };

    // Build permissions — admin gets all, manager loads from DB, others get none
    let permissions: SessionPayload["permissions"] = DEFAULT_PERMISSIONS;
    if (user.role === "admin") {
      permissions = ADMIN_PERMISSIONS;
    } else if (user.role === "manager") {
      const perms = await db.query.staffPermissions.findFirst({
        where: eq(staffPermissions.userId, user.id),
      });
      if (perms) {
        permissions = {
          canManageMenu:        perms.canManageMenu,
          canViewFinance:       perms.canViewFinance,
          canManageCoupons:     perms.canManageCoupons,
          canViewInventory:     perms.canViewInventory,
          canBroadcastWhatsapp: perms.canBroadcastWhatsapp,
          canManageStaff:       perms.canManageStaff,
          maxDiscountPercentage: perms.maxDiscountPercentage,
        };
      } else {
        // No record yet — manager gets full access by default
        permissions = ADMIN_PERMISSIONS;
      }
    }

    const payload: SessionPayload = {
      id:             user.id,
      role:           user.role as UserRole,
      name:           user.name,
      sessionVersion: user.sessionVersion,
      permissions,
    };

    await createSession(payload);

    return {
      success:    true,
      redirectTo: PORTAL_ROUTES[user.role as UserRole],
    };
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return { error: "An unexpected error occurred. Please try again later." };
  }
}

// Kept for backward compat — delegates to loginStaff
export async function loginAdmin(data: LoginInput) {
  return loginStaff(data);
}

export async function logoutStaff() {
  await deleteSession();
  return { success: true };
}

// Keep old name for backward compat
export async function logoutAdmin() {
  return logoutStaff();
}
