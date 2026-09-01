import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/database/db";
import { whatsappMessages } from "@/database/schema";
import { Client } from "@upstash/qstash";

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

// Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Webhook Reception (POST)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // Validate Signature if APP_SECRET is set
  if (APP_SECRET && signature) {
    const expectedSignature = `sha256=${crypto
      .createHmac("sha256", APP_SECRET)
      .update(rawBody, "utf8")
      .digest("hex")}`;
      
    if (signature !== expectedSignature) {
      console.error("[WhatsApp Webhook] Invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Handle WhatsApp messages
  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value && change.value.messages) {
          const message = change.value.messages[0];
          const contact = change.value.contacts?.[0];
          const phone = message.from;
          const messageId = message.id;
          const metadata = change.value.metadata;
          const restaurantId = metadata?.phone_number_id || "default";

          // Idempotency Check
          try {
            await db.insert(whatsappMessages).values({
              whatsappMessageId: messageId,
              phone: phone,
              direction: "inbound",
              status: "pending",
              payload: message,
            });
          } catch (error: any) {
            // Check for duplicate key constraint (Neon wraps it in error.cause)
            const isDuplicate = 
              error.code === "23505" || 
              error.message?.includes("duplicate key") ||
              error.cause?.code === "23505";

            if (isDuplicate) {
              console.log("[WhatsApp Webhook] Duplicate test message blocked:", messageId);
              continue; // Skip processing this duplicate
            }
            console.error("[WhatsApp Webhook] DB error on insert:", error);
          }

          // Process via QStash Background Job
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
            await qstashClient.publishJSON({
              url: `${baseUrl}/api/jobs/process-whatsapp`,
              body: {
                phone,
                message,
                contact,
                restaurantId, // Extracted from Meta metadata (or "default" if absent)
              },
              // Give a custom deduplication ID based on Meta message ID as extra safety (QStash deduplicates for 10 min)
              deduplicationId: `msg_${messageId}`,
            });
          } catch (qError) {
            console.error("[WhatsApp Webhook] QStash publish error:", qError);
            // Even if QStash fails, we must return 200 to Meta or it will retry indefinitely. 
            // In a strict environment, we'd alert here.
          }
        }
      }
    }
  }

  // Return 200 immediately after processing
  return new NextResponse("OK", { status: 200 });
}
