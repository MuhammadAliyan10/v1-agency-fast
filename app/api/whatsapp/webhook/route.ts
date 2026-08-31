import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/database/db";
import { whatsappMessages } from "@/database/schema";
import { processWhatsAppMessage } from "@/lib/whatsapp/processor";

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
            // If uniqueness constraint fails, it's a duplicate retry from Meta
            if (error.code === "23505" || error.message?.includes("duplicate key")) {
              console.log("[WhatsApp Webhook] Duplicate message received, ignoring:", messageId);
              continue; 
            }
            console.error("[WhatsApp Webhook] DB error on insert:", error);
          }

          // Process the message asynchronously to return 200 OK to Meta quickly
          processWhatsAppMessage(phone, message, contact).catch(console.error);
        }
      }
    }
  }

  // Return 200 immediately
  return new NextResponse("OK", { status: 200 });
}
