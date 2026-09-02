"use server";

import { db } from "@/database/db";
import { users, orders } from "@/database/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireManagerPermission } from "@/lib/auth/session";

export async function getCustomers() {
  await requireManagerPermission("staff", "update");
  try {
    const customersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
        totalOrders: sql<number>`count(${orders.id})::int`,
        lifetimeSpend: sql<number>`COALESCE(sum(case when ${orders.status} = 'delivered' then ${orders.totalAmount} else 0 end), 0)::int`,
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.customerId))
      .where(eq(users.role, "customer"))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return { success: true, data: customersData };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

export async function toggleCustomerStatus(userId: string, isActive: boolean) {
  await requireManagerPermission("staff", "update");
  try {
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle customer status:", error);
    return { success: false, error: "Failed to update customer account." };
  }
}
