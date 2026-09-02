"use server";

import { db } from "@/database/db";
import { outboundMessages, users, orders } from "@/database/schema";
import { requireManagerPermission, requireSuperAdmin } from "@/lib/auth/session";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type OutboxMessage = {
  id: string;
  phone: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date | null;
  nextRetryAt: Date | null;
};

export async function getOutboxMessages(page: number = 1, limit: number = 20) {
  await requireManagerPermission("whatsapp", "create");

  try {
    const offset = (page - 1) * limit;

    const [totalCountResult] = await db.select({ count: sql<number>`count(*)` }).from(outboundMessages);
    const totalCount = Number(totalCountResult.count);

    const messages = await db
      .select({
        id: outboundMessages.id,
        phone: outboundMessages.phone,
        status: outboundMessages.status,
        attempts: outboundMessages.attempts,
        lastError: outboundMessages.lastError,
        createdAt: outboundMessages.createdAt,
        nextRetryAt: outboundMessages.nextRetryAt,
      })
      .from(outboundMessages)
      .orderBy(desc(outboundMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return { 
      success: true, 
      data: {
        messages,
        pagination: {
          total: totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        }
      } 
    };
  } catch (error) {
    console.error("Failed to fetch outbox messages:", error);
    return { success: false, error: "Failed to fetch outbox messages." };
  }
}

export async function retryMessage(messageId: string) {
  await requireManagerPermission("whatsapp", "create");
  try {
    await db.update(outboundMessages)
      .set({ status: "pending", attempts: 0, lastError: null, nextRetryAt: null, updatedAt: new Date() })
      .where(eq(outboundMessages.id, messageId));
      
    revalidatePath("/admin/outbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to retry message:", error);
    return { success: false, error: "Failed to retry message." };
  }
}

export async function queueBroadcast(payload: {
  text: string;
  mediaUrl?: string;
  channel?: "whatsapp" | "sms";
}) {
  await requireManagerPermission("whatsapp", "create");

  try {
    // 1. Fetch Customers from Users table
    const customers = await db.select({ phone: users.phone }).from(users).where(eq(users.role, "customer"));
    
    // 2. Fetch distinct phones from Orders table (guests)
    const guestOrders = await db.select({ phone: orders.customerPhone }).from(orders);

    // 3. Deduplicate
    const phoneSet = new Set<string>();
    for (const c of customers) {
      if (c.phone) phoneSet.add(c.phone.replace(/[^0-9+]/g, ""));
    }
    for (const o of guestOrders) {
      if (o.phone) phoneSet.add(o.phone.replace(/[^0-9+]/g, ""));
    }
    
    // Remove empty strings
    phoneSet.delete("");

    const targetPhones = Array.from(phoneSet);

    if (targetPhones.length === 0) {
      return { success: false, error: "No target customers found." };
    }

    // 4. Chunk into batches of 500 to prevent DB/Server timeouts
    const BATCH_SIZE = 500;
    const now = new Date();

    for (let i = 0; i < targetPhones.length; i += BATCH_SIZE) {
      const chunk = targetPhones.slice(i, i + BATCH_SIZE);
      
      const insertData = chunk.map(phone => ({
        phone,
        payload: {
          type: "text",
          text: { body: payload.text }
        },
        status: "pending" as const,
        createdAt: now,
      }));

      await db.insert(outboundMessages).values(insertData);
    }

    revalidatePath("/admin/outbox");
    return { success: true, count: targetPhones.length };
  } catch (error) {
    console.error("Failed to queue broadcast:", error);
    return { success: false, error: "Failed to queue broadcast messages." };
  }
}
