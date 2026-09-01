import { db } from "@/database/db";
import { whatsappMessages } from "@/database/schema";

const WHATSAPP_API_URL = "https://graph.facebook.com/v25.0";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppMessage(
  to: string,
  payload: any,
  restaurantId: string = "default"
) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("[WhatsApp Client] Missing tokens. Simulating send to:", to);
    console.log(JSON.stringify(payload, null, 2));
    
    // Still record it in DB for tracking
    await db.insert(whatsappMessages).values({
      whatsappMessageId: `sim_${Date.now()}_${Math.random()}`,
      restaurantId,
      phone: to,
      direction: "outbound",
      status: "delivered",
      payload,
    });
    
    return true;
  }

  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...payload,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp Client] Error sending message:", data);
      
      await db.insert(whatsappMessages).values({
        whatsappMessageId: `err_${Date.now()}_${Math.random()}`,
        restaurantId,
        phone: to,
        direction: "outbound",
        status: "failed",
        payload,
      });
      return false;
    }

    const messageId = data.messages?.[0]?.id || `out_${Date.now()}`;
    
    await db.insert(whatsappMessages).values({
      whatsappMessageId: messageId,
      restaurantId,
      phone: to,
      direction: "outbound",
      status: "sent",
      payload,
    });

    return true;
  } catch (error) {
    console.error("[WhatsApp Client] Exception sending message:", error);
    return false;
  }
}

export async function sendWhatsAppText(to: string, text: string) {
  return sendWhatsAppMessage(to, {
    type: "text",
    text: { body: text },
  });
}

export async function sendWhatsAppImage(to: string, url: string, caption?: string) {
  return sendWhatsAppMessage(to, {
    type: "image",
    image: {
      link: url,
      ...(caption && { caption }),
    },
  });
}

export async function sendWhatsAppInteractiveButtons(
  to: string,
  text: string,
  buttons: { id: string; title: string }[]
) {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.substring(0, 20) }, // Max 20 chars
        })).slice(0, 3), // Max 3 buttons
      },
    },
  });
}

export async function sendWhatsAppInteractiveList(
  to: string,
  text: string,
  buttonText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
) {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text },
      action: {
        button: buttonText.substring(0, 20),
        sections: sections.map((s) => ({
          title: s.title.substring(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id.substring(0, 200),
            title: r.title.substring(0, 24),
            description: r.description ? r.description.substring(0, 72) : undefined,
          })),
        })),
      },
    },
  });
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer | null> {
  if (!ACCESS_TOKEN) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });
    const data = await res.json();
    if (!data.url) return null;

    const mediaRes = await fetch(data.url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });
    
    if (!mediaRes.ok) return null;
    const arrayBuffer = await mediaRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[WhatsApp Media Error]", error);
    return null;
  }
}
