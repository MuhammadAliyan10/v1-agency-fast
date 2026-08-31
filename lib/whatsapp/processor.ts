import { db } from "@/database/db";
import { whatsappSessions, menuItems, categories } from "@/database/schema";
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

      case "alt_phone_input":
        await handleAltPhoneInput(phone, session, input);
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
  // Fetch active categories
  const allCategories = await db.select().from(categories).where(eq(categories.isActive, true));
  
  // Fetch active items
  const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
  
  if (allItems.length === 0) {
    return sendWhatsAppText(phone, "Sorry, we are currently closed or out of stock.");
  }

  // WhatsApp allows up to 10 sections and 30 items max.
  const sections: any[] = [];
  let totalItems = 0;

  for (const category of allCategories) {
    if (sections.length >= 10 || totalItems >= 30) break;
    
    const itemsInCategory = allItems.filter(i => i.categoryId === category.id);
    if (itemsInCategory.length === 0) continue;

    const rows = [];
    for (const item of itemsInCategory) {
      if (totalItems >= 30) break;
      rows.push({
        id: `item_${item.id}`,
        title: item.name.substring(0, 24), // title limit is 24 chars
        description: `Rs. ${item.basePrice}`
      });
      totalItems++;
    }

    if (rows.length > 0) {
      sections.push({
        title: category.name.substring(0, 24), // section title limit is 24 chars
        rows
      });
    }
  }

  await sendWhatsAppInteractiveList(
    phone,
    "Welcome to Classy Crave! 🍔 Please select an item to order:",
    "View Menu",
    sections
  );

  await updateSessionState(session.id, "item_selection", [], {});
}

async function handleItemSelection(phone: string, session: any, input: string) {
  if (input === "checkout" || input === "done") {
    if ((session.cart as any[]).length === 0) {
      return sendWhatsAppText(phone, "Your cart is empty. Please select an item from the menu first.");
    }
    await sendWhatsAppText(phone, "Great! Please reply with your full delivery address (e.g. House 12, Street 4, Sector F).");
    return updateSessionState(session.id, "address_input", session.cart, session.tempData);
  }

  if (input === "menu") {
    return handleGreeting(phone, session);
  }

  if (input === "drinks") {
    // Show drinks category (id: find drinks category or just show list of drinks)
    const allCategories = await db.select().from(categories).where(eq(categories.isActive, true));
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    
    const drinkCat = allCategories.find(c => c.name.toLowerCase().includes("drink") || c.name.toLowerCase().includes("beverage"));
    if (drinkCat) {
      const drinks = allItems.filter(i => i.categoryId === drinkCat.id).slice(0, 30);
      if (drinks.length > 0) {
        const rows = drinks.map(i => ({
          id: `item_${i.id}`,
          title: i.name.substring(0, 24),
          description: `Rs. ${i.basePrice}`
        }));
        await sendWhatsAppInteractiveList(
          phone,
          "Here are our refreshing drinks! 🥤",
          "View Drinks",
          [{ title: "Drinks", rows }]
        );
        return updateSessionState(session.id, "item_selection", session.cart, session.tempData);
      }
    }
    
    // Fallback if no drinks category found
    await sendWhatsAppText(phone, "We don't have a specific drinks menu right now. Showing full menu...");
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
    
    // Check if we should cross-sell drinks
    const itemCategory = await db.query.categories.findFirst({ where: eq(categories.id, matchedItem.categoryId) });
    const isFood = itemCategory && !itemCategory.name.toLowerCase().includes("drink") && !itemCategory.name.toLowerCase().includes("beverage");
    
    if (isFood) {
      await sendWhatsAppInteractiveButtons(
        phone,
        `Added 1x ${matchedItem.name} to cart. Would you like a drink with that?`,
        [
          { id: "drinks", title: "Yes, Show Drinks" },
          { id: "checkout", title: "Checkout Now" },
          { id: "menu", title: "View Menu Again" }
        ]
      );
    } else {
      await sendWhatsAppInteractiveButtons(
        phone,
        `Added 1x ${matchedItem.name} to cart. Anything else?`,
        [
          { id: "checkout", title: "Checkout Now" },
          { id: "menu", title: "View Menu Again" }
        ]
      );
    }

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
  await sendWhatsAppText(phone, "Got it! Please provide an alternate/backup phone number.");
  return updateSessionState(session.id, "alt_phone_input", session.cart, newTemp);
}

async function handleAltPhoneInput(phone: string, session: any, input: string) {
  const newTemp = { ...(session.tempData as any), altPhone: input };
  await sendWhatsAppText(phone, "Perfect. Lastly, what is your full name?");
  return updateSessionState(session.id, "name_input", session.cart, newTemp);
}

async function handleNameInput(phone: string, session: any, input: string) {
  const newTemp = { ...(session.tempData as any), name: input };
  
  // Calculate summary (approximate for display)
  const cart = session.cart as any[];
  const itemIds = cart.map(c => c.menuItemId);
  const dbItems = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));
  
  let summary = `*Order Summary*\nName: ${input}\nAddress: ${newTemp.address}\nAlt Phone: ${newTemp.altPhone}\n\n*Items:*\n`;
  let total = 0;
  cart.forEach(c => {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    if (dbItem) {
      summary += `${c.quantity}x ${dbItem.name} (Rs. ${dbItem.basePrice})\n`;
      total += dbItem.basePrice * c.quantity;
    }
  });
  summary += `\nDelivery: Rs. 150\n*Total: Rs. ${total + 150}*\nPayment: Cash on Delivery\n\nIs this correct?`;

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
