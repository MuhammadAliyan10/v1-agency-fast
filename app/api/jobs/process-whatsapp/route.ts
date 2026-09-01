import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from "@/database/db";
import { whatsappSessions } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { processWhatsAppMessage } from "@/lib/whatsapp/processor";

async function handler(req: NextRequest) {
  const body = await req.json();
  const { phone, message, contact, restaurantId } = body;

  if (!phone || !message) {
    return new NextResponse("Invalid Payload", { status: 400 });
  }

  // 1. Serialization Lock
  // Attempt to acquire a lock for this phone conversation.
  // We check if lockedAt is null OR if the lock has expired (e.g., stuck for > 10 seconds)
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - 10000); // 10 seconds max lock duration

  // The below is a simplistic way to lock using PostgreSQL's returning clause
  // In a high contention environment, standard Redis locks are better. 
  const lockAcquired = await db.update(whatsappSessions)
    .set({ lockedAt: now })
    .where(
      sql`${whatsappSessions.restaurantId} = ${restaurantId} 
          AND ${whatsappSessions.phone} = ${phone} 
          AND (${whatsappSessions.lockedAt} IS NULL OR ${whatsappSessions.lockedAt} < ${lockExpiry})`
    )
    .returning({ id: whatsappSessions.id });

  // If the session exists but we couldn't acquire the lock, it means another message is currently being processed.
  if (lockAcquired.length === 0) {
    // Check if session actually exists to ensure we aren't failing on first-time users.
    const sessionExists = await db.query.whatsappSessions.findFirst({
      where: sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`
    });

    if (sessionExists) {
      console.log(`[QStash Worker] Conversation for ${phone} is locked. Requeuing...`);
      // Returning 409 Conflict will cause QStash to use its exponential backoff and retry later.
      return new NextResponse("Conversation Locked - Retry Later", { status: 409 });
    }
  }

  try {
    // 2. Process Message
    // This will create the session if it doesn't exist.
    await processWhatsAppMessage(phone, message, contact);
  } catch (error) {
    console.error("[QStash Worker] Error processing message:", error);
    // Important: Release lock even on error!
    await db.update(whatsappSessions)
      .set({ lockedAt: null })
      .where(sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`);
      
    // Throwing 500 will make QStash retry.
    return new NextResponse("Processing Error", { status: 500 });
  }

  // 3. Release Lock
  await db.update(whatsappSessions)
    .set({ lockedAt: null })
    .where(sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`);

  return new NextResponse("OK", { status: 200 });
}

// verifySignatureAppRouter ensures only Upstash can call this public endpoint
export const POST = verifySignatureAppRouter(handler);
