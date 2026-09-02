// server/actions/auth.ts
"use server";

import { db } from "@/database/db";
import { eq } from "drizzle-orm";
import { users, staffPermissions } from "@/database/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession, getSession, PORTAL_ROUTES, type UserRole, type SessionPayload } from "@/lib/auth/session";
import { RBACMatrixSchema, DEFAULT_RBAC_MATRIX } from "@/lib/auth/rbac";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const STAFF_ROLES: UserRole[] = ["admin", "manager", "kitchen", "waiter", "rider"];

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

    const ALL_TRUE = { read: true, create: true, update: true, delete: true };
    const ADMIN_PERMS = {
      menu: ALL_TRUE, finance: ALL_TRUE, coupons: ALL_TRUE, 
      inventory: ALL_TRUE, staff: ALL_TRUE, orders: ALL_TRUE, whatsapp: ALL_TRUE,
      maxDiscountPercentage: 100,
    };
    
    // Build permissions — admin gets all, manager loads from DB, others get none
    let permissions = { ...DEFAULT_RBAC_MATRIX, maxDiscountPercentage: 0 };
    if (user.role === "admin") {
      permissions = ADMIN_PERMS;
    } else if (user.role === "manager") {
      const perms = await db.query.staffPermissions.findFirst({
        where: eq(staffPermissions.userId, user.id),
      });
      if (perms) {
        const parsedMatrix = RBACMatrixSchema.catch(DEFAULT_RBAC_MATRIX).parse(perms.permissions || {});
        permissions = {
          ...parsedMatrix,
          maxDiscountPercentage: perms.maxDiscountPercentage,
        };
      } else {
        permissions = ADMIN_PERMS;
      }
    }

    const payload: SessionPayload = {
      id:             user.id,
      email:          user.email!,
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

export async function getCurrentSession() {
  return await getSession();
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
