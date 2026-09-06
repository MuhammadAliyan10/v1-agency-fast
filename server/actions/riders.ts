"use server";

import { db } from "@/database/db";
import { users, riderProfiles } from "@/database/schema";
import { requireManagerPermission } from "@/lib/auth/session";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getRiders() {
  await requireManagerPermission("staff", "update");
  try {
    // We need to fetch riders and left join their orders to sum pending cash
    // For simplicity, we can fetch riders and then fetch their pending cash in a separate query,
    // or use a subquery. A separate query is safer with Drizzle neon-http.
    const ridersData = await db
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

    // Fetch pending cash for each rider
    const pendingCashQuery = await db.execute(sql`
      SELECT rider_id, SUM(total_amount) as pending_cash 
      FROM orders 
      WHERE payment_status = 'collected_by_rider' AND rider_id IS NOT NULL 
      GROUP BY rider_id
    `);

    const pendingCashMap = pendingCashQuery.rows.reduce((acc: any, row: any) => {
      acc[row.rider_id] = parseFloat(row.pending_cash) || 0;
      return acc;
    }, {});

    const data = ridersData.map(rider => ({
      ...rider,
      pendingCash: pendingCashMap[rider.id] || 0,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch riders:", error);
    return { success: false, error: "Failed to fetch riders." };
  }
}

export async function settleRiderCash(riderUserId: string) {
  await requireManagerPermission("finance", "read");
  try {
    await db.execute(sql`
      UPDATE orders 
      SET payment_status = 'paid', updated_at = NOW() 
      WHERE rider_id = ${riderUserId} AND payment_status = 'collected_by_rider'
    `);
    
    revalidatePath("/admin/riders");
    return { success: true };
  } catch (error) {
    console.error("Failed to settle rider cash:", error);
    return { success: false, error: "Failed to settle cash." };
  }
}

export async function updateRiderStatus(riderId: string, status: "available" | "busy" | "offline") {
  await requireManagerPermission("staff", "update");
  try {
    await db
      .update(riderProfiles)
      .set({ status })
      .where(eq(riderProfiles.id, riderId));
    revalidatePath("/admin/riders");
    return { success: true };
  } catch (error) {
    console.error("Failed to update rider status:", error);
    return { success: false, error: "Failed to update rider status." };
  }
}

export async function toggleRiderActive(userId: string, isActive: boolean) {
  await requireManagerPermission("staff", "update");
  try {
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    revalidatePath("/admin/riders");
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
  await requireManagerPermission("staff", "update");
  try {
    // Pre-check for both phone and email before hitting DB constraints
    const [byPhone, byEmail] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.phone, data.phone) }),
      data.email ? db.query.users.findFirst({ where: eq(users.email, data.email) }) : Promise.resolve(null),
    ]);

    if (byPhone) return { success: false, error: "A user with this phone number already exists." };
    if (byEmail) return { success: false, error: "A user with this email address already exists." };

    let passwordHash = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    const [newUser] = await db.insert(users).values({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      role: "rider",
      passwordHash,
      isActive: true,
    }).returning({ id: users.id });

    await db.insert(riderProfiles).values({
      userId: newUser.id,
      vehicleType: data.vehicleType || "bike",
      vehiclePlate: data.vehiclePlate || null,
      status: "offline",
    });

    revalidatePath("/admin/riders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create rider:", error);
    // Catch any race-condition duplicate that slipped through the pre-check
    const isDuplicate = error?.code === "23505" || error?.cause?.code === "23505" || error?.message?.includes("duplicate key");
    if (isDuplicate) {
      const detail: string = error?.detail ?? error?.cause?.detail ?? "";
      if (detail.includes("email")) return { success: false, error: "A user with this email address already exists." };
      if (detail.includes("phone")) return { success: false, error: "A user with this phone number already exists." };
      return { success: false, error: "A rider with this phone or email already exists." };
    }
    return { success: false, error: "Failed to create rider." };
  }
}
