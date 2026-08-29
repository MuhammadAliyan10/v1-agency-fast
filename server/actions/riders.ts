"use server";

import { db } from "@/database/db";
import { users, riderProfiles } from "@/database/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function getRiders() {
  await requireAdmin();
  try {
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        isActive: users.isActive,
        riderId: riderProfiles.id,
        vehicleType: riderProfiles.vehicleType,
        vehiclePlate: riderProfiles.vehiclePlate,
        status: riderProfiles.status,
        currentOrderId: riderProfiles.currentOrderId,
      })
      .from(users)
      .leftJoin(riderProfiles, eq(users.id, riderProfiles.userId))
      .where(eq(users.role, "rider"));
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch riders:", error);
    return { success: false, error: "Failed to fetch riders." };
  }
}

export async function updateRiderStatus(riderId: string, status: "available" | "busy" | "offline") {
  await requireAdmin();
  try {
    await db
      .update(riderProfiles)
      .set({ status })
      .where(eq(riderProfiles.id, riderId));
    return { success: true };
  } catch (error) {
    console.error("Failed to update rider status:", error);
    return { success: false, error: "Failed to update rider status." };
  }
}

export async function toggleRiderActive(userId: string, isActive: boolean) {
  await requireAdmin();
  try {
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle rider active state:", error);
    return { success: false, error: "Failed to update rider." };
  }
}

export async function createRider(data: {
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
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

    // Transaction to insert user and profile
    await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        role: "rider",
        passwordHash,
        isActive: true,
      }).returning({ id: users.id });

      await tx.insert(riderProfiles).values({
        userId: newUser.id,
        vehicleType: data.vehicleType || "bike",
        vehiclePlate: data.vehiclePlate || null,
        status: "offline",
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to create rider:", error);
    return { success: false, error: "Failed to create rider." };
  }
}
