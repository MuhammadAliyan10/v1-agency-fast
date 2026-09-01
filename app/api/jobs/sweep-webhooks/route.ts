import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from "@/database/db";
import { whatsappMessages } from "@/database/schema";
import { eq, and, sql, lte, lt } from "drizzle-orm";
import { Client } from "@upstash/qstash";

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });

async function handler(req: NextRequest) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  
  // Find messages that have been stuck in 'pending' for > 2 minutes and haven't exceeded 5 attempts
  const stuckMessages = await db.query.whatsappMessages.findMany({
    where: and(
      eq(whatsappMessages.status, "pending"),
      lte(whatsappMessages.createdAt, twoMinutesAgo),
      lt(whatsappMessages.attemptCount, 5)
    ),
    limit: 50,
  });

  if (stuckMessages.length === 0) {
    return new NextResponse("No stuck messages found", { status: 200 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  let recoveredCount = 0;

  for (const msg of stuckMessages) {
    try {
      const newAttemptCount = msg.attemptCount + 1;
      
      // We publish using a unique deduplication ID for this attempt to prevent runaway queues
      await qstashClient.publishJSON({
        url: `${baseUrl}/api/jobs/process-whatsapp`,
        body: {
          phone: msg.phone,
          message: msg.payload, // payload was originally the 'message' object
          contact: null, // we might not have it saved explicitly, but processor handles it
          restaurantId: msg.restaurantId,
        },
        deduplicationId: `msg_${msg.whatsappMessageId}_attempt_${newAttemptCount}`,
      });

      await db.update(whatsappMessages)
        .set({ 
          attemptCount: newAttemptCount, 
          lastAttemptAt: new Date(),
        })
        .where(eq(whatsappMessages.id, msg.id));
      
      recoveredCount++;
    } catch (error) {
      console.error(`[Webhook Sweeper] Failed to republish message ${msg.whatsappMessageId}:`, error);
      
      // If we failed to publish, just increment attempt count so we don't retry forever
      const newAttemptCount = msg.attemptCount + 1;
      const nextStatus = newAttemptCount >= 5 ? "failed" : "pending";
      
      await db.update(whatsappMessages)
        .set({ 
          attemptCount: newAttemptCount, 
          lastAttemptAt: new Date(),
          status: nextStatus as any
        })
        .where(eq(whatsappMessages.id, msg.id));
    }
  }

  return new NextResponse(`Recovered ${recoveredCount} messages`, { status: 200 });
}

export const POST = verifySignatureAppRouter(handler);
