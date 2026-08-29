"use server";

import { db } from "@/database/db";
import { users } from "@/database/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function getStaff() {
  await requireAdmin();
  try {
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, ["admin", "manager", "kitchen"]));
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return { success: false, error: "Failed to fetch staff." };
  }
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  await requireAdmin();
  try {
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle staff status:", error);
    return { success: false, error: "Failed to update staff member." };
  }
}

export async function createStaff(data: {
  name: string;
  phone: string;
  email: string;
  role: "admin" | "manager" | "kitchen";
  password?: string;
}) {
  await requireAdmin();
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

    await db.insert(users).values({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      role: data.role,
      passwordHash,
      isActive: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to create staff:", error);
    return { success: false, error: "Failed to create staff member." };
  }
}
