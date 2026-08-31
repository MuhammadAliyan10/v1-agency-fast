import { db } from "@/database/db";
import { whatsappSessions, menuItems } from "@/database/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { sendWhatsAppText, sendWhatsAppInteractiveList, sendWhatsAppInteractiveButtons } from "./client";
import { createOrderFromWhatsApp } from "@/server/actions/whatsapp-orders";

export async function processWhatsAppMessage(phone: string, message: any, contact: any) {
  const restaurantId = "default"; // Multi-tenant ready
  
  // 1. Get or Create Session
  let sessionList = await db.select().from(whatsappSessions).where(
    sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`
  );
  
  let session = sessionList[0];
  if (!session) {
    const newSession = await db.insert(whatsappSessions).values({
      restaurantId,
      phone,
      state: "greeting",
      cart: [],
      tempData: {},
    }).returning();
    session = newSession[0];
  }

  // 2. Extract Message Intent
  const textBody = message.text?.body?.toLowerCase().trim() || "";
  const interactiveReplyId = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id;
  const input = interactiveReplyId || textBody;

  if (!input) return; // unsupported message type (image, audio, etc for MVP)

  // 3. Human Handoff Check
  if (input === "human" || input === "agent" || input === "talk to staff") {
    await db.update(whatsappSessions)
      .set({ state: "human_handoff", updatedAt: new Date() })
      .where(eq(whatsappSessions.id, session.id));
    return sendWhatsAppText(phone, "I've paused the bot. A human staff member will reply to you shortly.");
  }

  if (session.state === "human_handoff") {
    // Ignore messages while in handoff
    return;
  }

  // 4. Expiry Check (e.g. 2 hours inactive)
  const hoursSinceUpdate = (new Date().getTime() - new Date(session.updatedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 2 && session.state !== "greeting") {
    session.state = "greeting";
    session.cart = [];
    session.tempData = {};
    await sendWhatsAppText(phone, "Your previous session expired. Let's start over!");
  }

  // 5. State Machine Router
  try {
    switch (session.state) {
      case "greeting":
      case "expired":
      case "order_created":
      case "cancelled":
        await handleGreeting(phone, session);
        break;
      
      case "category_selection":
      case "item_selection":
        await handleItemSelection(phone, session, input);
        break;

      case "address_input":
        await handleAddressInput(phone, session, input);
        break;

      case "name_input":
        await handleNameInput(phone, session, input);
        break;

      case "order_confirmation":
        await handleConfirmation(phone, session, input);
        break;

      default:
        await handleGreeting(phone, session);
    }
  } catch (error: any) {
    console.error("[WhatsApp Processor Error]", error);
    await sendWhatsAppText(phone, "Oops, something went wrong on our end. Please type 'Hi' to restart.");
  }
}

async function handleGreeting(phone: string, session: any) {
  const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true)).limit(10);
  
  if (items.length === 0) {
    return sendWhatsAppText(phone, "Sorry, we are currently closed or out of stock.");
  }

  const rows = items.map(i => ({
    id: `item_${i.id}`,
    title: i.name,
    description: `Rs. ${i.basePrice}`
  }));

  await sendWhatsAppInteractiveList(
    phone,
    "Welcome! 🍔 Please select an item to order:",
    "View Menu",
    [{ title: "Popular Items", rows }]
  );

  await updateSessionState(session.id, "item_selection", [], {});
}

async function handleItemSelection(phone: string, session: any, input: string) {
  if (input === "checkout" || input === "done") {
    if ((session.cart as any[]).length === 0) {
      return sendWhatsAppText(phone, "Your cart is empty. Please select an item from the menu first.");
    }
    await sendWhatsAppText(phone, "Great! Please reply with your full delivery address.");
    return updateSessionState(session.id, "address_input", session.cart, session.tempData);
  }

  if (input === "menu") {
    return handleGreeting(phone, session);
  }

  let matchedItem = null;
  if (input.startsWith("item_")) {
    const itemId = input.replace("item_", "");
    const dbItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (dbItem) matchedItem = dbItem;
  } else {
    // Fuzzy fallback
    const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    matchedItem = items.find(i => 
      i.name.toLowerCase().includes(input) || 
      input.includes(i.name.toLowerCase())
    );
  }

  if (matchedItem) {
    const newCart = [...(session.cart as any[]), { menuItemId: matchedItem.id, quantity: 1 }];
    
    await sendWhatsAppInteractiveButtons(
      phone,
      `Added 1x ${matchedItem.name} to cart. Anything else?`,
      [
        { id: "checkout", title: "Checkout" },
        { id: "menu", title: "View Menu Again" }
      ]
    );

    return updateSessionState(session.id, "item_selection", newCart, session.tempData);
  } else {
    // Send menu again
    await sendWhatsAppText(phone, "I didn't quite catch that.");
    await handleGreeting(phone, session);
  }
}

async function handleAddressInput(phone: string, session: any, input: string) {
  if (input.length < 5) {
    return sendWhatsAppText(phone, "Please provide a more detailed address.");
  }

  const newTemp = { ...(session.tempData as any), address: input };
  await sendWhatsAppText(phone, "Got it! Lastly, what is your name?");
  return updateSessionState(session.id, "name_input", session.cart, newTemp);
}

async function handleNameInput(phone: string, session: any, input: string) {
  const newTemp = { ...(session.tempData as any), name: input };
  
  // Calculate summary (approximate for display)
  const cart = session.cart as any[];
  const itemIds = cart.map(c => c.menuItemId);
  const dbItems = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));
  
  let summary = `*Order Summary*\nName: ${input}\nAddress: ${newTemp.address}\n\n*Items:*\n`;
  let total = 0;
  cart.forEach(c => {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    if (dbItem) {
      summary += `${c.quantity}x ${dbItem.name} (Rs. ${dbItem.basePrice})\n`;
      total += dbItem.basePrice * c.quantity;
    }
  });
  summary += `\nDelivery: Rs. 150\n*Total: Rs. ${total + 150}*\n\nIs this correct?`;

  await sendWhatsAppInteractiveButtons(phone, summary, [
    { id: "confirm_yes", title: "Yes, Confirm" },
    { id: "confirm_no", title: "Cancel Order" }
  ]);

  return updateSessionState(session.id, "order_confirmation", cart, newTemp);
}

async function handleConfirmation(phone: string, session: any, input: string) {
  if (input === "confirm_yes" || input === "yes") {
    try {
      const order = await createOrderFromWhatsApp(phone, session.restaurantId);
      
      const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/track/${order.orderId}`;
      await sendWhatsAppText(phone, `🎉 Order confirmed! Your Order ID is #${order.orderId}.\n\nTrack your delivery here: ${trackUrl}`);
      
    } catch (error: any) {
      console.error("Order creation failed:", error);
      await sendWhatsAppText(phone, `Sorry, we couldn't place your order: ${error.message}`);
      await updateSessionState(session.id, "greeting", [], {});
    }
  } else if (input === "confirm_no" || input === "no" || input === "cancel") {
    await sendWhatsAppText(phone, "Order cancelled. Type 'Hi' anytime to order again.");
    await updateSessionState(session.id, "cancelled", [], {});
  } else {
    await sendWhatsAppInteractiveButtons(phone, "Please confirm your order.", [
      { id: "confirm_yes", title: "Yes, Confirm" },
      { id: "confirm_no", title: "Cancel Order" }
    ]);
  }
}

async function updateSessionState(id: string, state: any, cart: any[], tempData: any) {
  await db.update(whatsappSessions)
    .set({ state, cart, tempData, updatedAt: new Date() })
    .where(eq(whatsappSessions.id, id));
}
