import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from "@/database/db";
import { outboundMessages, whatsappMessages } from "@/database/schema";
import { eq, inArray, sql, lt } from "drizzle-orm";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

async function handler(req: NextRequest) {
  // Grab up to 50 pending or retryable messages
  const now = new Date();
  
  const messagesToProcess = await db.query.outboundMessages.findMany({
    where: sql`${outboundMessages.status} = 'pending' 
               OR (${outboundMessages.status} = 'retry' AND ${outboundMessages.nextRetryAt} <= ${now})`,
    limit: 50,
  });

  if (messagesToProcess.length === 0) {
    return new NextResponse("No messages to process", { status: 200 });
  }

  // Mark as sending to avoid double processing
  const messageIds = messagesToProcess.map(m => m.id);
  await db.update(outboundMessages)
    .set({ status: "sending", updatedAt: now })
    .where(inArray(outboundMessages.id, messageIds));

  // Process messages
  for (const msg of messagesToProcess) {
    try {
      // Simulate WhatsApp API Call
      // We bypass sendWhatsAppText here and directly use sendWhatsAppMessage so we can extract Meta's message ID if needed
      // Actually sendWhatsAppMessage returns a boolean currently, let's just use it
      const success = await sendWhatsAppMessage(msg.phone, msg.payload, "default");
      
      if (success) {
        await db.update(outboundMessages)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(outboundMessages.id, msg.id));
      } else {
        throw new Error("WhatsApp API returned false");
      }
    } catch (error: any) {
      const attempts = msg.attempts + 1;
      let nextStatus: "retry" | "failed" = "retry";
      const nextRetryAt = new Date(Date.now() + (Math.pow(2, attempts) * 1000)); // Exponential backoff

      if (attempts >= 5) {
        nextStatus = "failed";
      }

      await db.update(outboundMessages)
        .set({ 
          status: nextStatus, 
          attempts,
          lastError: error.message || "Unknown error",
          nextRetryAt: nextStatus === "retry" ? nextRetryAt : null,
          updatedAt: new Date()
        })
        .where(eq(outboundMessages.id, msg.id));
    }
  }

  return new NextResponse("Processed", { status: 200 });
}

export const POST = verifySignatureAppRouter(handler);
