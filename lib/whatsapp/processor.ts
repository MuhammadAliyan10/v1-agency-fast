import { db } from "@/database/db";
import { whatsappSessions, menuItems, categories, itemVariants, orders } from "@/database/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { sendWhatsAppText, sendWhatsAppInteractiveList, sendWhatsAppInteractiveButtons, sendWhatsAppImage } from "./client";
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
  let input = interactiveReplyId || textBody;

  if (message.type === "location") {
    input = "location_payload";
  }

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

  // 4. Global Command Interception (Prevents state loops)
  if (input === "hi" || input === "hello" || input === "restart") {
    const isFirstTime = (session.cart || []).length === 0 && Object.keys((session.tempData as any) || {}).length === 0;
    session.state = "greeting";
    session.cart = [];
    session.tempData = {};
    return handleGreeting(phone, session, isFirstTime);
  }

  // Order Status Tracking
  if (["status", "track", "track order", "where is my order"].includes(input)) {
    const lastOrder = await db.query.orders.findFirst({
      where: eq(orders.customerPhone, phone),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)]
    });
    if (lastOrder) {
      await sendWhatsAppText(phone, `Your latest order #${lastOrder.id} is currently: *${lastOrder.status.toUpperCase().replace(/_/g, " ")}*.\nTotal: Rs. ${lastOrder.totalAmount}`);
    } else {
      await sendWhatsAppText(phone, "I couldn't find any recent orders for this number.");
    }
    return;
  }

  if (input === "menu") {
    session.state = "greeting";
    return handleGreeting(phone, session, true);
  }

  if (input === "confirm_yes" || input === "confirm_no") {
    // If they click a confirmation button, force route to confirmation handler
    // even if the state machine got out of sync
    return handleConfirmation(phone, session, input);
  }

  // 4b. Expiry Check (e.g. 2 hours inactive)
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

      case "cart_review":
        await handleQuantityInput(phone, session, input);
        break;

      case "address_input":
        await handleAddressInput(phone, session, input, message);
        break;

      case "alt_phone_input":
        await handleAltPhoneInput(phone, session, input);
        break;

      case "name_input":
        await handleNameInput(phone, session, input);
        break;

      case "checkout":
        await handleInstructionsInput(phone, session, input);
        break;

      case "order_confirmation":
        await handleConfirmation(phone, session, input);
        break;

      default:
        await handleGreeting(phone, session, false);
    }
  } catch (error: any) {
    console.error("[WhatsApp Processor Error]", error);
    await sendWhatsAppText(phone, "Oops, something went wrong on our end. Please type 'Hi' to restart.");
  }
}

async function handleGreeting(phone: string, session: any, showImages: boolean = false) {
  // Fetch active categories
  const allCategories = await db.select().from(categories).where(eq(categories.isActive, true));
  
  if (allCategories.length === 0) {
    return sendWhatsAppText(phone, "Sorry, we are currently closed or out of stock.");
  }

  const rows = [];
  for (const cat of allCategories.slice(0, 10)) {
    rows.push({
      id: `cat_${cat.id}`,
      title: cat.name.substring(0, 24),
      description: "Tap to view items"
    });
  }

  const cart = session.cart || [];
  const isReturning = cart.length > 0;
  
  const greetingText = isReturning 
    ? "What else would you like to add? 🍔 Please select a category:" 
    : "Welcome to Classy Crave! What can I do for you today? 🍔 Please select a category:";

  if (showImages) {
    const baseUrl = "https://agency-fast.vercel.app";
    await Promise.all([
      sendWhatsAppImage(phone, `${baseUrl}/menu/Deals.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/menu/IceCreams.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/menu/Items.jpeg`)
    ]);
  }

  await Promise.all([
    sendWhatsAppInteractiveList(
      phone,
      greetingText,
      "Menu Categories",
      [{ title: "Categories", rows }]
    ),
    updateSessionState(session.id, "category_selection", session.cart || [], session.tempData || {})
  ]);
}

async function addItemToCartAndProceed(phone: string, session: any, itemId: string, variantId: string | null = null) {
  const matchedItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
  if (!matchedItem) return handleGreeting(phone, session, false);

  let price = matchedItem.basePrice;
  let name = matchedItem.name;
  if (variantId) {
    const variant = await db.query.itemVariants.findFirst({ where: eq(itemVariants.id, variantId) });
    if (variant) {
      price = variant.price;
      name = `${matchedItem.name} (${variant.name})`;
    }
  }

  // Clear pendingItemId from tempData and set pendingCartItem
  const newTemp = { 
    ...(session.tempData as any), 
    pendingCartItem: { menuItemId: itemId, variantId, name, price, categoryId: matchedItem.categoryId } 
  };
  delete newTemp.pendingItemId;

  await sendWhatsAppInteractiveButtons(
    phone,
    `How many ${name} would you like? (Tap a number or type your quantity)`,
    [
      { id: "qty_1", title: "1" },
      { id: "qty_2", title: "2" },
      { id: "qty_3", title: "3" }
    ]
  );

  return updateSessionState(session.id, "cart_review", session.cart, newTemp);
}

async function handleQuantityInput(phone: string, session: any, input: string) {
  let qty = 1;
  
  if (input.startsWith("qty_")) {
    qty = parseInt(input.replace("qty_", ""));
  } else {
    const parsed = parseInt(input);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      qty = parsed;
    } else {
      await sendWhatsAppText(phone, "Please select a valid quantity (or type a number like 1, 2, 3).");
      return;
    }
  }

  const pendingItem = session.tempData.pendingCartItem;
  if (!pendingItem) {
     return handleGreeting(phone, session);
  }

  const newCart = [...(session.cart as any[]), { 
    menuItemId: pendingItem.menuItemId, 
    variantId: pendingItem.variantId, 
    quantity: qty, 
    name: pendingItem.name, 
    price: pendingItem.price 
  }];

  const newTemp = { ...(session.tempData as any) };
  delete newTemp.pendingCartItem;

  // Check if we should cross-sell drinks
  const itemCategory = await db.query.categories.findFirst({ where: eq(categories.id, pendingItem.categoryId) });
  const isFood = itemCategory && !itemCategory.name.toLowerCase().includes("drink") && !itemCategory.name.toLowerCase().includes("beverage");
  
  if (isFood) {
    await sendWhatsAppInteractiveButtons(
      phone,
      `Added ${qty}x ${pendingItem.name} to cart! Would you like a cold refreshing drink with that?`,
      [
        { id: "drinks", title: "Yes, Show Drinks" },
        { id: "checkout", title: "Checkout Now" },
        { id: "menu", title: "View Menu Again" }
      ]
    );
  } else {
    await sendWhatsAppInteractiveButtons(
      phone,
      `Added ${qty}x ${pendingItem.name} to cart! Anything else?`,
      [
        { id: "checkout", title: "Checkout Now" },
        { id: "menu", title: "View Menu Again" }
      ]
    );
  }

  return updateSessionState(session.id, "item_selection", newCart, newTemp);
}

async function handleItemSelection(phone: string, session: any, input: string) {
  if (input === "checkout" || input === "done") {
    if ((session.cart as any[]).length === 0) {
      return sendWhatsAppText(phone, "Your cart is empty. Please select an item from the menu first.");
    }
    
    // Pitch Dessert if not pitched yet
    if (!session.tempData?.dessertPitched) {
      const newTemp = { ...(session.tempData as any), dessertPitched: true };
      await sendWhatsAppInteractiveButtons(
        phone,
        `Before you checkout, would you like a sweet dessert or Ice Cream to complete your meal?`,
        [
          { id: "show_desserts", title: "Yes, Show me!" },
          { id: "final_checkout", title: "No thanks, Checkout" }
        ]
      );
      return updateSessionState(session.id, "item_selection", session.cart, newTemp);
    }
    
    await sendWhatsAppText(phone, "Great! Please reply with your full delivery address (e.g. House 12, Street 4, Sector F) OR tap the 📎 Attachment icon and share your Location.");
    return updateSessionState(session.id, "address_input", session.cart, session.tempData);
  }

  if (input === "final_checkout") {
    await sendWhatsAppText(phone, "Great! Please reply with your full delivery address (e.g. House 12, Street 4, Sector F) OR tap the 📎 Attachment icon and share your Location.");
    return updateSessionState(session.id, "address_input", session.cart, session.tempData);
  }

  if (input === "show_desserts") {
    const baseUrl = "https://agency-fast.vercel.app";
    await sendWhatsAppImage(phone, `${baseUrl}/menu/IceCreams.jpeg`, "Our delicious Ice Creams & Desserts! 🍦");
    
    // Attempt to route directly to dessert category if it exists
    const dessertCat = await db.query.categories.findFirst({
      where: (cat, { ilike, or }) => or(ilike(cat.name, "%dessert%"), ilike(cat.name, "%ice cream%"))
    });
    if (dessertCat) {
      return handleItemSelection(phone, session, `cat_${dessertCat.id}`);
    }
    return handleGreeting(phone, session, false);
  }

  if (input === "menu") {
    return handleGreeting(phone, session, true);
  }

  if (input.startsWith("cat_")) {
    const catId = input.replace("cat_", "");
    const cat = await db.query.categories.findFirst({ where: eq(categories.id, catId) });
    if (!cat) return handleGreeting(phone, session, false);

    const items = await db.select().from(menuItems).where(eq(menuItems.categoryId, cat.id));
    const activeItems = items.filter(i => i.isAvailable).slice(0, 10);
    
    if (activeItems.length === 0) {
      await sendWhatsAppText(phone, `Sorry, no items currently available in ${cat.name}.`);
      return handleGreeting(phone, session, false);
    }

    const rows = activeItems.map(i => ({
      id: `item_${i.id}`,
      title: i.name.substring(0, 24),
      description: `Rs. ${i.basePrice}`
    }));

    await sendWhatsAppInteractiveList(
      phone,
      `Here is our ${cat.name} menu:`,
      "View Items",
      [{ title: cat.name.substring(0, 24), rows }]
    );
    return updateSessionState(session.id, "item_selection", session.cart, session.tempData);
  }

  if (input === "drinks") {
    // Show drinks category (id: find drinks category or just show list of drinks)
    const allCategories = await db.select().from(categories).where(eq(categories.isActive, true));
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    
    const drinkCat = allCategories.find(c => c.name.toLowerCase().includes("drink") || c.name.toLowerCase().includes("beverage"));
    if (drinkCat) {
      const drinks = allItems.filter(i => i.categoryId === drinkCat.id).slice(0, 10); // WhatsApp max 10 rows per section
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
  if (session.tempData?.pendingItemId) {
    if (input.startsWith("var_")) {
      const variantId = input.replace("var_", "");
      return addItemToCartAndProceed(phone, session, session.tempData.pendingItemId, variantId);
    }
    await sendWhatsAppText(phone, "Please select a size/variant from the options provided.");
    return;
  }

  if (input.startsWith("item_")) {
    const itemId = input.replace("item_", "");
    const dbItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (dbItem) matchedItem = dbItem;
  } else {
    // Fuzzy fallback (only if input is long enough to avoid false positives)
    if (input.length > 3) {
      const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
      matchedItem = items.find(i => 
        i.name.toLowerCase().includes(input) || 
        input.includes(i.name.toLowerCase())
      );
    }
  }

  if (matchedItem) {
    // Check for variants
    const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, matchedItem.id));
    if (variants.length > 0) {
      const newTemp = { ...(session.tempData as any), pendingItemId: matchedItem.id };
      if (variants.length <= 3) {
        await sendWhatsAppInteractiveButtons(
          phone,
          `You selected ${matchedItem.name}. Please choose a size/variant:`,
          variants.map(v => ({ id: `var_${v.id}`, title: v.name }))
        );
      } else {
        await sendWhatsAppInteractiveList(
          phone,
          `You selected ${matchedItem.name}. Please choose a size:`,
          "Choose Size",
          [{ title: "Sizes", rows: variants.slice(0, 10).map(v => ({ id: `var_${v.id}`, title: v.name, description: `Rs. ${v.price}` })) }]
        );
      }
      return updateSessionState(session.id, "item_selection", session.cart, newTemp);
    } else {
      return addItemToCartAndProceed(phone, session, matchedItem.id, null);
    }
  } else {
    // Send menu again
    await sendWhatsAppText(phone, "I didn't quite catch that.");
    await handleGreeting(phone, session);
  }
}

async function handleAddressInput(phone: string, session: any, input: string, message?: any) {
  let finalAddress = input;
  let lat = null;
  let long = null;

  if (message?.type === "location" && message.location) {
    lat = message.location.latitude;
    long = message.location.longitude;
    finalAddress = `📍 Pinned Location via WhatsApp`;
  } else {
    if (!/[a-zA-Z]/.test(input) || input.length < 5) {
      await sendWhatsAppText(phone, "Please provide a valid, complete delivery address containing letters (e.g. House 12, Street 4, DHA), OR tap the 📎 attachment icon and share your Location.");
      return;
    }
  }

  const newTemp = { ...(session.tempData as any), address: finalAddress, lat, long };
  await sendWhatsAppText(phone, "Got it! Please provide your active CALLING number (not just your WhatsApp number) so the rider can reach you.");
  return updateSessionState(session.id, "alt_phone_input", session.cart, newTemp);
}

async function handleAltPhoneInput(phone: string, session: any, input: string) {
  // basic validation for phone number
  if (input.replace(/\D/g, "").length < 7) {
    await sendWhatsAppText(phone, "Please provide a valid phone number (e.g. 03001234567).");
    return;
  }
  const newTemp = { ...(session.tempData as any), altPhone: input };
  await sendWhatsAppText(phone, "Perfect. Lastly, what is your full name?");
  return updateSessionState(session.id, "name_input", session.cart, newTemp);
}

async function handleNameInput(phone: string, session: any, input: string) {
  // Validate name (must contain letters, not just numbers)
  if (!/[a-zA-Z]/.test(input) || input.length < 2) {
    await sendWhatsAppText(phone, "Please provide a valid full name (must contain letters).");
    return;
  }

  const newTemp = { ...(session.tempData as any), name: input };
  await sendWhatsAppText(phone, "Got it! Do you have any special instructions for the kitchen? (Type 'none' if you don't).");
  return updateSessionState(session.id, "checkout", session.cart, newTemp);
}

async function handleInstructionsInput(phone: string, session: any, input: string) {
  const newTemp = { ...(session.tempData as any), instructions: input };
  
  // Calculate summary (approximate for display)
  const cart = session.cart as any[];
  const itemIds = cart.map(c => c.menuItemId);
  const dbItems = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));
  
  let summary = `*Order Summary*\nName: ${newTemp.name}\nAddress: ${newTemp.address}\nAlt Phone: ${newTemp.altPhone}\nInstructions: ${input}\n\n*Items:*\n`;
  let total = 0;
  cart.forEach(c => {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    const itemName = c.name || dbItem?.name || "Item";
    const itemPrice = c.price || dbItem?.basePrice || 0;
    
    summary += `${c.quantity}x ${itemName} (Rs. ${itemPrice})\n`;
    total += itemPrice * c.quantity;
  });
  summary += `\nDelivery: Rs. 150\n*Total: Rs. ${total + 150}*\nPayment: Cash on Delivery\n\nIs this correct?`;

  await sendWhatsAppInteractiveButtons(phone, summary, [
    { id: "confirm_yes", title: "Yes, Confirm" },
    { id: "confirm_no", title: "Cancel Order" }
  ]);

  return updateSessionState(session.id, "order_confirmation", session.cart, newTemp);
}

async function handleConfirmation(phone: string, session: any, input: string) {
  if (input === "confirm_yes" || input === "yes") {
    try {
      const order = await createOrderFromWhatsApp(phone, session.restaurantId);
      
      const trackUrl = `https://agency-fast.vercel.app/track/${order.orderId}`;
      await sendWhatsAppText(phone, `🎉 Order confirmed! Your Order ID is #${order.orderId}.\n\nTrack your delivery here: ${trackUrl}\n\nType 'Hi' anytime if you'd like to place another order!`);
      
      await updateSessionState(session.id, "order_created", [], {});
    } catch (error: any) {
      console.error("Order creation failed:", error);
      await sendWhatsAppText(phone, `Sorry, we couldn't place your order: ${error.message}`);
      await updateSessionState(session.id, "greeting", [], {});
    }
  } else if (input === "confirm_no" || input === "no" || input === "cancel") {
    await sendWhatsAppText(phone, "Order cancelled. Type 'Hi' anytime to start over and order again.");
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
