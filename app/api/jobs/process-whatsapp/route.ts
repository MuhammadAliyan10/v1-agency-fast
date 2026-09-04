import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from "@/database/db";
import { whatsappSessions } from "@/database/schema";
import { sql } from "drizzle-orm";
import { processWhatsAppMessage } from "@/lib/whatsapp/processor";

/** Helper — releases the conversation lock unconditionally. */
async function releaseLock(restaurantId: string, phone: string): Promise<void> {
  await db
    .update(whatsappSessions)
    .set({ lockedAt: null })
    .where(
      sql`${whatsappSessions.restaurantId} = ${restaurantId}
          AND ${whatsappSessions.phone} = ${phone}`
    );
}

async function handler(req: NextRequest) {
  const body = await req.json();
  const { phone, message, contact, restaurantId } = body;

  if (!phone || !message) {
    return new NextResponse("Invalid Payload", { status: 400 });
  }

  const now = new Date();
  // Locks older than 10 s are considered stale (worker crashed without releasing).
  const lockExpiry = new Date(now.getTime() - 10_000);

  // ─── Step 1: Try to acquire the lock on an EXISTING session ──────────────
  // The UPDATE only matches rows whose lock is NULL or expired, so it is
  // inherently atomic at the DB level.
  const lockAcquired = await db
    .update(whatsappSessions)
    .set({ lockedAt: now })
    .where(
      sql`${whatsappSessions.restaurantId} = ${restaurantId}
          AND ${whatsappSessions.phone} = ${phone}
          AND (${whatsappSessions.lockedAt} IS NULL
               OR ${whatsappSessions.lockedAt} < ${lockExpiry})`
    )
    .returning({ id: whatsappSessions.id });

  if (lockAcquired.length === 0) {
    // The UPDATE matched 0 rows — either:
    //   (a) Session exists and is held by another worker  →  requeue
    //   (b) Session doesn't exist yet (brand-new user)    →  upsert + race-win check below

    const sessionExists = await db.query.whatsappSessions.findFirst({
      where: sql`${whatsappSessions.restaurantId} = ${restaurantId}
                 AND ${whatsappSessions.phone} = ${phone}`,
    });

    if (sessionExists) {
      // Case (a) — actively locked by another worker; let QStash retry with backoff.
      console.log(`[QStash Worker] Conversation for ${phone} is locked. Requeuing...`);
      return new NextResponse("Conversation Locked - Retry Later", { status: 409 });
    }

    // ─── Step 2: New user — INSERT with lock held, guarding the race ─────
    // ON CONFLICT DO NOTHING ensures only one concurrent worker wins.
    // The unique constraint is (restaurantId, phone) — see schema.
    await db
      .insert(whatsappSessions)
      .values({
        restaurantId,
        phone,
        state: "language_selection",
        cart: [],
        tempData: {},
        language: "en",
        lockedAt: now,
      })
      .onConflictDoNothing();

    // Verify we actually won the race by confirming our exact lockedAt timestamp
    // was persisted. If another worker beat us here, wonRace will be null.
    const wonRace = await db.query.whatsappSessions.findFirst({
      where: sql`${whatsappSessions.restaurantId} = ${restaurantId}
                 AND ${whatsappSessions.phone} = ${phone}
                 AND ${whatsappSessions.lockedAt} = ${now}`,
    });

    if (!wonRace) {
      // Another worker beat us — let QStash retry this message.
      console.log(`[QStash Worker] Lost new-session race for ${phone}. Requeuing...`);
      return new NextResponse("Conversation Locked - Retry Later", { status: 409 });
    }
  }

  // ─── Step 3: Process the message (lock is held) ──────────────────────────
  try {
    await processWhatsAppMessage(phone, message, contact);
  } catch (error) {
    console.error("[QStash Worker] Error processing message:", error);
    // Always release the lock on failure so subsequent retries aren't blocked.
    await releaseLock(restaurantId, phone);
    // 500 causes QStash to retry with exponential backoff.
    return new NextResponse("Processing Error", { status: 500 });
  }

  // ─── Step 4: Release lock on success ─────────────────────────────────────
  await releaseLock(restaurantId, phone);

  return new NextResponse("OK", { status: 200 });
}

// verifySignatureAppRouter ensures only Upstash can call this public endpoint
export const POST = verifySignatureAppRouter(handler);
