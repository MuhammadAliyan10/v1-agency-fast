import { db } from "@/database/db";
import { whatsappSessions, menuItems, categories, itemVariants, orders, orderItems, deals, dealSlots, storeSettings } from "@/database/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { sendWhatsAppText, sendWhatsAppInteractiveList, sendWhatsAppInteractiveButtons, sendWhatsAppImage, downloadWhatsAppMedia, sendWhatsAppItemCard } from "./client";
import { transcribeVoiceNote } from "./ai-helper";
import { createOrderFromWhatsApp } from "@/server/actions/whatsapp-orders";


function getPaginatedRows(items: any[], page: number, prefix: string, mapFn: (item: any) => any) {
  const limit = 9;
  const start = (page - 1) * limit;
  const end = start + limit;
  const sliced = items.slice(start, end);

  const rows = sliced.map(mapFn);

  if (items.length > end) {
    rows.push({
      id: `${prefix}_page_${page + 1}`,
      title: "➡️ Next Page",
      description: "Tap for more options"
    });
  }
  return rows;
}

function t(en: string, lang: string = "en"): string {
  if (lang === "en") return en;
  const dict: Record<string, string> = {
    "Welcome to Classy Crave! What can I do for you today? 🍔 Please select a category:": "Classy Crave mein khush aamdeed! 🍔 Baraye meharbani apni pasandida category select karein:",
    "What else would you like to add? 🍔 Please select a category:": "Aap mazeed kya add karna pasand karenge? 🍔 Baraye meharbani category select karein:",
    "Your cart is empty. Please select an item from the menu first.": "Aapka cart abhi khali hai. Pehle menu se koi item select karein, shukriya.",
    "Sorry, we are currently closed or out of stock.": "Maazrat, hum abhi band hain ya stock khatam hai.",
    "Tap to view items": "Items dekhne ke liye tap karein",
    "Menu Categories": "Menu Categories",
    "Categories": "Categories",
    "View Items": "Items Dekhein",
    "Checkout Now": "Checkout Karein",
    "View Menu Again": "Menu Dobara Dekhein",
    "Yes, Show Deals/Drinks": "Jee, Deals/Drinks Dikhayein",
    "Yes, Show Drinks": "Jee, Drinks Dikhayein",
    "Yes, Show me!": "Jee, Zaroor Dikhayein!",
    "No thanks, Checkout": "Nahi shukriya, Checkout karein",
    "Got it! Please provide your active CALLING number (not just your WhatsApp number) so the rider can reach you.": "Theek hai! Baraye meharbani apna active CALLING number batayein (sirf WhatsApp nahi) taake rider aap se ba-asani raabta kar sake.",
    "Use Previous": "Pichli Tafseelat Use Karein",
    "Enter New": "Nayi Tafseelat Darj Karein",
    "Edit/Remove Items": "Items Edit/Remove Karein",
    "Yes, Confirm": "Jee, Confirm Karein",
    "Cancel Order": "Order Cancel Karein"
  };

  if (dict[en]) return dict[en];

  if (en.includes("to cart! Would you like to try our special")) {
    return en.replace("Added", "Add kar diya gaya:").replace("to cart! Would you like to try our special Crown Crust Pizza with that?", "cart mein! Kya aap hamara special Crown Crust Pizza try karna chahenge?");
  }
  if (en.includes("to cart! How about a sweet dessert")) {
    return en.replace("Added", "Add kar diya gaya:").replace("to cart! How about a sweet dessert to go with your meal?", "cart mein! Khane ke baad kuch meetha ho jaye?");
  }
  if (en.includes("to cart! Would you like a cold refreshing drink with that?")) {
    return en.replace("Added", "Add kar diya gaya:").replace("to cart! Would you like a cold refreshing drink with that?", "cart mein! Kya aap iske sath thandi drink lena pasand karenge?");
  }
  if (en.includes("to cart! Anything else?")) {
    return en.replace("Added", "Add kar diya gaya:").replace("to cart! Anything else?", "cart mein! Aur kuch lena pasand karenge?");
  }
  if (en.includes("How many")) {
    return en.replace("How many", "Aap kitne").replace("would you like? (Tap a number or type your quantity)", "lena chahenge? (Number tap karein ya type karein)");
  }
  if (en.includes("Before you checkout, would you like a sweet dessert or Ice Cream to complete your meal?")) {
    return "Checkout karne se pehle, kya aap khane ke baad kuch meetha (Dessert / Ice Cream) lena pasand karenge?";
  }
  if (en.includes("Great! Please reply with your full delivery address")) {
    return "Zabardast! Baraye meharbani apna mukammal delivery address type karein, ya apna WhatsApp Location pin share karein.";
  }
  if (en.includes("Got it! Can I have your full name please?")) {
    return "Samajh gaya! Baraye meharbani apna mukammal naam batayein?";
  }
  if (en.includes("Thanks! Any special instructions for the chef or rider?")) {
    return "Shukriya! Chef ya rider ke liye koi khaas hidayat? (Agar nahi toh bas 'No' type kardein).";
  }

  if (en.includes("Got it! Do you have any special instructions for the kitchen? (Type 'none' if you don't).")) {
    return "Samajh gaya! Kitchen ke liye koi khaas hidayat? (Agar nahi toh bas 'none' likh dein).";
  }
  if (en.includes("Perfect. Lastly, what is your full name?")) {
    return "Zabardast! Akhri sawal, baraye meharbani apna mukammal naam bata dein?";
  }
  if (en.includes("Order cancelled. Type 'Hi' anytime to start over and order again.")) {
    return "Aapka order cancel kar diya gaya hai. Jab bhi naya order karna ho, bas 'Hi' bhejein. Shukriya!";
  }
  if (en.includes("Order cancelled. Let's start over.")) {
    return "Order cancel kar diya gaya hai. Chaliye shuru se shuru karte hain.";
  }
  if (en.includes("Please confirm your order.")) {
    return "Baraye meharbani apna order confirm karein.";
  }

  if (en.includes("You have an active order (#")) {
    return en.replace("You have an active order (#", "Aapka ek order (#")
             .replace(") currently being processed. What would you like to do?", ") pehle se active hai. Aap kya karna chahenge?");
  }
  if (en.includes("Welcome back to Classy Crave! Would you like to repeat your last order or see the menu?")) {
    return "Classy Crave mein wapas khush aamdeed! Kya aap apna pichla order repeat karna pasand karenge ya naya menu dekhna chahenge?";
  }
  if (en.includes("Sorry, your order has already been accepted by the kitchen and cannot be cancelled via WhatsApp. Please call the restaurant.")) {
    return "Maazrat, aapka order kitchen mein ban raha hai aur ab WhatsApp se cancel nahi ho sakta. Baraye meharbani restaurant ko call karein.";
  }

  if (en.includes("Order confirmed! Your Order ID is #")) {
    return en.replace("Order confirmed! Your Order ID is #", "Zabardast! Aapka Order confirm ho gaya hai! Aapka Order ID # hai: ")
             .replace("Track your delivery here:", "Apni delivery yahan track karein:")
             .replace("Type 'Hi' anytime if you'd like to place another order!", "Naya order karne ke liye kisi bhi waqt 'Hi' bhejein, Shukriya!");
  }

  return en;
}


type AppSession = typeof whatsappSessions.$inferSelect;
type CartItem = { menuItemId: string, variantId?: string | null, quantity: number, name?: string, price?: number, isDeal?: boolean, specialInstructions?: string };

export async function processWhatsAppMessage(phone: string, message: any, contact: any) {
  const restaurantId = "default"; // Multi-tenant ready

  // 1. Get or Create Session
  const sessionList = await db.select().from(whatsappSessions).where(
    sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`
  );

  let session = sessionList[0];
  if (!session) {
    const newSession = await db.insert(whatsappSessions).values({
      restaurantId,
      phone,
      state: "language_selection",
      cart: [],
      tempData: {},
      language: "en"
    }).returning();
    session = newSession[0];
  } else {
    // Session Timeout Check (1 Hour)
    const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
    if (session.updatedAt && Date.now() - session.updatedAt.getTime() > SESSION_TIMEOUT_MS) {
      if (session.state !== "greeting" && session.state !== "language_selection") {
        await sendWhatsAppText(phone, "Maafi chahta hoon, aapka pichla session waqt guzar jane ki wajah se expire ho gaya hai. Chaliye naya order shuru karte hain.");
        session.state = "greeting";
        session.cart = [];
        session.tempData = {};
        await db.update(whatsappSessions)
          .set({ state: "greeting", cart: [], tempData: {}, updatedAt: new Date() })
          .where(eq(whatsappSessions.id, session.id));
      }
    }
  }

  // 1a. Check Business Hours
  const settings = await db.select().from(storeSettings).where(eq(storeSettings.key, "is_accepting_orders"));
  const isAcceptingOrders = settings.length > 0 ? settings[0].value === "true" : true;
  
  // If the user types 'human' or is in human_handoff, we let it pass, otherwise intercept.
  const textBody = message.text?.body?.toLowerCase().trim() || "";
  if (!isAcceptingOrders && session.state !== "human_handoff" && textBody !== "human" && textBody !== "agent" && textBody !== "talk to staff") {
    return sendWhatsAppText(phone, "Maafi chahta hoon, restaurant abhi orders nahi le raha. Humari services filhal band hain. Shukriya!");
  }

  // 2. Extract Message Intent
  const interactiveReplyId = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id;
  let input = interactiveReplyId || textBody;

  // Intercept if new session but language not selected
  if (session.state === "language_selection" && message.type === "text" && !input.startsWith("lang_")) {
    // If they typed something but haven't selected a language yet
    return sendWhatsAppInteractiveButtons(
      phone,
      "Please select your preferred language / Baraye meharbani apni zaban muntakhib karein:",
      [
        { id: "lang_en", title: "English" },
        { id: "lang_ur", title: "Roman Urdu" }
      ]
    );
  }

  if (message.type === "location") {
    input = "location_payload";
  }

  // Handle Audio Voice Notes
  if (message.type === "audio" && message.audio?.id) {
    const audioBuffer = await downloadWhatsAppMedia(message.audio.id);
    if (audioBuffer) {
      const transcription = await transcribeVoiceNote(audioBuffer);
      if (transcription) {
        input = transcription.trim().toLowerCase();
      } else {
        await sendWhatsAppText(phone, "Sorry, I couldn't process your voice note clearly. Please try typing instead.");
        return;
      }
    } else {
      await sendWhatsAppText(phone, "Sorry, I couldn't download your voice note right now.");
      return;
    }
  }

  if (!input) return; // unsupported message type (image, video, etc)

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
  if (input === "cancel" || input === "start over") {
    await sendWhatsAppText(phone, t("Order cancelled. Let's start over.", session.language));
    return updateSessionState(session.id, "greeting", [], {});
  }

  if (session.state === "deal_builder" && ["hi", "hello", "menu", "back", "cancel"].includes(input)) {
    await sendWhatsAppText(phone, "Combo builder cancelled.");
    session.tempData = {};
    session.state = "greeting";
    return handleGreeting(phone, session, true);
  }

  if (input === "menu") {
    const categoriesList = await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    });
    let menuText = "*Main Menu*\n\n";
    categoriesList.forEach(c => {
      menuText += `*${c.name}*\n`;
    });
    menuText += "\nPlease type the name of the category or item you'd like to order.";
    await sendWhatsAppText(phone, menuText);
    return updateSessionState(session.id, "menu_browsing", session.cart || [], {});
  }

  if (input === "help") {
    await sendWhatsAppText(phone, "Need help? You can type 'menu' to see what we offer, 'cart' to view your order, 'human' to speak to staff, or 'cancel' to start over.");
    return;
  }

  if (input === "hi" || input === "hello" || input === "restart") {

    // Check for Active Orders FIRST
    const lastOrder = await db.query.orders.findFirst({
      where: eq(orders.customerPhone, phone),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)]
    });

    if (lastOrder && ["pending", "approved", "preparing", "out_for_delivery", "ready_for_pickup", "delayed"].includes(lastOrder.status)) {
      session.tempData = { activeOrderId: lastOrder.id, activeOrderStatus: lastOrder.status };

      const buttons = [
        { id: "active_track", title: "Track Order" },
        { id: "active_new", title: "Place New Order" }
      ];

      if (lastOrder.status === "pending") {
        buttons.push({ id: "active_cancel", title: "Cancel Order" });
      }

      await sendWhatsAppInteractiveButtons(
        phone,
        t(`You have an active order (#${lastOrder.id}) currently being processed. What would you like to do?`, session.language),
        buttons
      );

      session.state = "active_order_menu";
      return updateSessionState(session.id, "active_order_menu", [], session.tempData);
    }

    // Check for past delivered order for Re-Order
    if (lastOrder && lastOrder.status === "delivered") {
      session.tempData = { pastOrderId: lastOrder.id };
      await sendWhatsAppInteractiveButtons(
        phone,
        t(`Welcome back to Classy Crave! Would you like to repeat your last order or see the menu?`, session.language),
        [
          { id: "reorder_yes", title: "Repeat Last Order" },
          { id: "reorder_no", title: "See Menu" }
        ]
      );
      session.state = "reorder_menu";
      return updateSessionState(session.id, "reorder_menu", [], session.tempData);
    }

    // Check if user already has items in cart or an active order flow in progress
    const hasActiveItemsOrSession = (session.cart && session.cart.length > 0) ||
      ["category_selection", "item_selection", "cart_review", "checkout", "address_input", "name_input", "deal_builder", "macro_selection"].includes(session.state);

    if (hasActiveItemsOrSession) {
      const itemCount = (session.cart || []).length;
      const promptMsg = session.language === "ur"
        ? `Aapka ek order session pehle se chal raha hai${itemCount > 0 ? ` (${itemCount} item(s) cart mein hain)` : ""}. Kya aap ise continue karna chahenge ya naya order start karna chahenge?`
        : `You have an active order session in progress${itemCount > 0 ? ` (${itemCount} item(s) in cart)` : ""}. Would you like to continue your current order or start a new session?`;

      await sendWhatsAppInteractiveButtons(
        phone,
        promptMsg,
        [
          { id: "session_continue", title: "Continue Order" },
          { id: "session_start_new", title: "Start New Session" }
        ]
      );
      return updateSessionState(session.id, "session_reset_confirm", session.cart || [], session.tempData || {});
    }

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
      case "language_selection":
        if (input === "lang_en" || input === "lang_ur") {
          const lang = input === "lang_ur" ? "ur" : "en";
          session.language = lang;
          await db.update(whatsappSessions).set({ language: lang, state: "greeting" }).where(eq(whatsappSessions.id, session.id));
          return handleGreeting(phone, session, true);
        } else {
          return sendWhatsAppInteractiveButtons(
            phone,
            "Please select your preferred language / Baraye meharbani apni zaban muntakhib karein:",
            [
              { id: "lang_en", title: "English" },
              { id: "lang_ur", title: "Roman Urdu" }
            ]
          );
        }

      case "active_order_menu":
        if (input === "active_track") {
          const activeOrderId = (session.tempData as any).activeOrderId;
          const activeOrder = await db.query.orders.findFirst({ where: eq(orders.id, activeOrderId) });
          if (activeOrder) {
            const trackUrl = `https://agency-fast.vercel.app/track/${activeOrder.id}`;
            const text = `Your order #${activeOrder.id} is currently: *${activeOrder.status.toUpperCase().replace(/_/g, " ")}*\nTotal: Rs. ${activeOrder.totalAmount}\n\nTrack online here: ${trackUrl}`;

            const buttons = [
              { id: "active_track", title: "Refresh Status" },
              { id: "active_new", title: "New Order" }
            ];

            if (activeOrder.status === "pending") {
              buttons.push({ id: "active_cancel", title: "Cancel Order" });
            }

            await sendWhatsAppInteractiveButtons(phone, text, buttons);
          }
          return;
        } else if (input === "active_new") {
          session.cart = [];
          session.tempData = {};
          return handleGreeting(phone, session, true);
        } else if (input === "active_cancel") {
          const activeOrderId = (session.tempData as any).activeOrderId;
          const activeOrder = await db.query.orders.findFirst({ where: eq(orders.id, activeOrderId) });
          if (activeOrder && activeOrder.status === "pending") {
            await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, activeOrder.id));
            await sendWhatsAppText(phone, t("Order cancelled. Type 'Hi' anytime to start over and order again.", session.language));
            return updateSessionState(session.id, "cancelled", [], {});
          } else {
            await sendWhatsAppText(phone, t("Sorry, your order has already been accepted by the kitchen and cannot be cancelled via WhatsApp. Please call the restaurant.", session.language));
            return;
          }
        }
        break;

      case "reorder_menu":
        if (input === "reorder_yes") {
          const pastOrderId = (session.tempData as any).pastOrderId;
          const pastOrderItems = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, pastOrderId) });
          const newCart = pastOrderItems.map(item => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId || undefined,
            quantity: item.quantity
          }));
          session.cart = newCart;
          session.tempData = {};
          await sendWhatsAppText(phone, t("Great! I've added your previous items to the cart.", session.language));
          return handleItemSelection(phone, session, "checkout");
        } else if (input === "reorder_no") {
          session.cart = [];
          session.tempData = {};
          return handleGreeting(phone, session, true);
        }
        break;

      case "previous_details_prompt":
        if (input === "use_prev") {
          const prevOrder = (session.tempData as any).previousOrder;
          const newTemp = {
            ...(session.tempData as any),
            name: prevOrder.customerName,
            address: prevOrder.deliveryAddress,
            lat: prevOrder.latitude,
            long: prevOrder.longitude,
            altPhone: phone
          };
          await sendWhatsAppText(phone, t("Thanks! Any special instructions for the chef or rider? (Or type 'No')", session.language));
          return updateSessionState(session.id, "checkout", session.cart || [], newTemp);
        } else if (input === "use_new") {
          await sendWhatsAppText(phone, t("Great! Please reply with your full delivery address (e.g. House 12, Street 4, Sector F) OR tap the 📎 Attachment icon and share your Location.", session.language));
          return updateSessionState(session.id, "address_input", session.cart || [], session.tempData);
        }
        break;

      case "session_reset_confirm":
        if (input === "session_continue") {
          const cartCount = (session.cart || []).length;
          if (cartCount > 0) {
            await sendWhatsAppInteractiveButtons(
              phone,
              session.language === "ur"
                ? `Continuing your order! Aapke cart mein ${cartCount} item(s) hain.`
                : `Continuing your order! You have ${cartCount} item(s) in your cart.`,
              [
                { id: "checkout", title: "Checkout Now" },
                { id: "menu", title: "View Menu / Add Items" }
              ]
            );
            return updateSessionState(session.id, "item_selection", session.cart || [], session.tempData);
          } else {
            return handleGreeting(phone, session, true);
          }
        } else if (input === "session_start_new") {
          session.cart = [];
          session.tempData = {};
          await sendWhatsAppText(phone, session.language === "ur" ? "Naya session shuru kar diya gaya hai." : "Started a new session.");
          return handleGreeting(phone, session, true);
        }
        break;

      case "greeting":
      case "expired":
      case "order_created":
      case "cancelled":
        await handleGreeting(phone, session, false);
        break;

      case "macro_selection":
        await handleMacroSelection(phone, session, input);
        break;

      case "deal_builder":
        await handleDealBuilder(phone, session, input);
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

      case "cart_edit":
        await handleCartEdit(phone, session, input);
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
  const cart = session.cart || [];
  const isReturning = cart.length > 0;

  const greetingText = isReturning
    ? t("What else would you like to add? 🍔 Please select a category:", session.language)
    : t("Welcome to Classy Crave! What can I do for you today? 🍔 Please select a category:", session.language);

  if (showImages && !session.tempData?.menuImagesSent) {
    const baseUrl = "https://agency-fast.vercel.app";
    await Promise.all([
      sendWhatsAppImage(phone, `${baseUrl}/Menu/Deals.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/Menu/IceCreams.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/Menu/Items.jpeg`)
    ]);
    session.tempData = session.tempData || {};
    session.tempData.menuImagesSent = true;
  }

  const rows = [
    { id: "macro_deals", title: "🎉 Deals & Combos", description: "Save big on meals!" },
    { id: "macro_menu", title: "🍔 Main Menu", description: "Pizzas, Burgers, etc." },
    { id: "macro_desserts", title: "🍦 Desserts", description: "Sweet treats" },
    { id: "macro_drinks", title: "🥤 Drinks", description: "Cold beverages" }
  ];

  await Promise.all([
    sendWhatsAppInteractiveList(
      phone,
      greetingText,
      t("Menu Categories", session.language),
      [{ title: t("Categories", session.language), rows }]
    ),
    updateSessionState(session.id, "macro_selection", session.cart || [], session.tempData || {})
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

  const descText = matchedItem.description ? `\n_${matchedItem.description}_` : "";
  await sendWhatsAppInteractiveButtons(
    phone,
    `*${name}*${descText}\n\n` + t("How many would you like? (Tap a number or type your quantity)", session.language),
    [
      { id: "qty_1", title: "1" },
      { id: "qty_2", title: "2" },
      { id: "qty_3", title: "3" }
    ]
  );

  return updateSessionState(session.id, "cart_review", session.cart || [], newTemp);
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
  const catName = itemCategory ? itemCategory.name.toLowerCase() : "";
  const isFood = catName && !catName.includes("drink") && !catName.includes("beverage") && !catName.includes("dessert") && !catName.includes("ice cream");

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
      return sendWhatsAppText(phone, t("Your cart is empty. Please select an item from the menu first.", session.language));
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
    // Check previous orders
    const lastOrder = await db.query.orders.findFirst({
      where: eq(orders.customerPhone, phone),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)]
    });

    if (lastOrder && lastOrder.customerName && lastOrder.deliveryAddress) {
      const newTemp = { ...(session.tempData as any), previousOrder: lastOrder };
      await sendWhatsAppInteractiveButtons(
        phone,
        t("We found your previous details:\nName: ", session.language) + lastOrder.customerName + t("\nAddress: ", session.language) + lastOrder.deliveryAddress + t("\nPhone: ", session.language) + phone + t("\n\nWould you like to use these details or enter new ones?", session.language),
        [
          { id: "use_prev", title: t("Use Previous", session.language) },
          { id: "use_new", title: t("Enter New", session.language) }
        ]
      );
      return updateSessionState(session.id, "previous_details_prompt", session.cart, newTemp);
    }

    await sendWhatsAppText(phone, t("Great! Please reply with your full delivery address (e.g. House 12, Street 4, Sector F) OR tap the 📎 Attachment icon and share your Location.", session.language));
    return updateSessionState(session.id, "address_input", session.cart, session.tempData);
  }

  if (input === "show_desserts") {
    const baseUrl = "https://agency-fast.vercel.app";
    await sendWhatsAppImage(phone, `${baseUrl}/Menu/IceCreams.jpeg`, "Our delicious Ice Creams & Desserts! 🍦");

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
    const page = parseInt(input.split("_page_")[1] || "1");
    const activeItems = items.filter(i => i.isAvailable);

    if (activeItems.length === 0) {
      await sendWhatsAppText(phone, `Sorry, no items currently available in ${cat.name}.`);
      return handleGreeting(phone, session, false);
    }

    const rows = getPaginatedRows(activeItems, page, `cat_${cat.id}`, (i: any) => ({
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

    const drinkCats = allCategories.filter(c =>
      c.name.toLowerCase().includes("drink") ||
      c.name.toLowerCase().includes("beverage") ||
      c.name.toLowerCase().includes("shake") ||
      c.name.toLowerCase().includes("smoothie")
    );

    if (drinkCats.length > 0) {
      const drinkCatIds = drinkCats.map(c => c.id);
      const drinks = allItems.filter(i => drinkCatIds.includes(i.categoryId)).slice(0, 10); // WhatsApp max 10 rows per section
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

  if (input.startsWith("view_item_")) {
    const itemId = input.replace("view_item_", "");
    const dbItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (dbItem) matchedItem = dbItem;
  } else if (input.startsWith("item_")) {
    const itemId = input.replace("item_", "");
    const dbItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (dbItem) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agency-fast.vercel.app";
      const imageUrl = dbItem.imageUrl || `${baseUrl}/Menu/Items.jpeg`;
      await sendWhatsAppItemCard(phone, dbItem.name, dbItem.basePrice, imageUrl, dbItem.id, "Order Now");
      return updateSessionState(session.id, "item_selection", session.cart, session.tempData);
    }
  } else {
    // Fuzzy fallback (only if input is long enough to avoid false positives)
    if (input.length > 3) {
      const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
      const fuzzyMatch = items.find(i =>
        i.name.toLowerCase().includes(input) ||
        input.includes(i.name.toLowerCase())
      );
      if (fuzzyMatch) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agency-fast.vercel.app";
        const imageUrl = fuzzyMatch.imageUrl || `${baseUrl}/Menu/Items.jpeg`;
        await sendWhatsAppItemCard(phone, fuzzyMatch.name, fuzzyMatch.basePrice, imageUrl, fuzzyMatch.id, "Order Now");
        return updateSessionState(session.id, "item_selection", session.cart, session.tempData);
      }
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

    // Meta API often provides name or address for places
    const locName = message.location.name;
    const locAddress = message.location.address;

    if (locName && locAddress) {
      finalAddress = ` ${locName}, ${locAddress}`;
    } else if (locName || locAddress) {
      finalAddress = ` ${locName || locAddress}`;
    } else {
      finalAddress = `Pinned Location via WhatsApp`;
    }
  } else {
    if (!/[a-zA-Z]/.test(input) || input.length < 5) {
      await sendWhatsAppText(phone, "Please provide a valid, complete delivery address containing letters (e.g. House 12, Street 4, DHA), OR tap the 📎 attachment icon and share your Location.");
      return;
    }
    // Capitalize first letter of each word
    finalAddress = input.replace(
      /\\w\\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
  }

  const newTemp = { ...(session.tempData as any), address: finalAddress, lat, long };
  await sendWhatsAppText(phone, t("Got it! Please provide your active CALLING number (not just your WhatsApp number) so the rider can reach you.", session.language));
  return updateSessionState(session.id, "alt_phone_input", session.cart, newTemp);
}

async function handleAltPhoneInput(phone: string, session: any, input: string) {
  // basic validation for phone number
  if (input.replace(/\D/g, "").length < 7) {
    await sendWhatsAppText(phone, "Please provide a valid phone number (e.g. 03001234567).");
    return;
  }
  const newTemp = { ...(session.tempData as any), altPhone: input };
  await sendWhatsAppText(phone, t("Perfect. Lastly, what is your full name?", session.language));
  return updateSessionState(session.id, "name_input", session.cart, newTemp);
}

async function handleNameInput(phone: string, session: any, input: string) {
  // Validate name (must contain letters, not just numbers)
  if (!/[a-zA-Z]/.test(input) || input.length < 2) {
    await sendWhatsAppText(phone, "Please provide a valid full name (must contain letters).");
    return;
  }

  const newTemp = { ...(session.tempData as any), name: input };
  await sendWhatsAppText(phone, t("Got it! Do you have any special instructions for the kitchen? (Type 'none' if you don't).", session.language));
  return updateSessionState(session.id, "checkout", session.cart, newTemp);
}

async function handleInstructionsInput(phone: string, session: any, input: string) {
  // Generate idempotency key for this checkout attempt
  const checkoutSessionId = "chk_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const newTemp = { ...(session.tempData as any), instructions: input, checkoutSessionId };

  // Calculate summary (approximate for display)
  const cart = session.cart as any[];
  const itemIds = cart.map(c => c.menuItemId);
  const dbItems = await db.select().from(menuItems).where(inArray(menuItems.id, itemIds));

  let summary = `*Order Summary*\nName: ${newTemp.name}\nAddress: ${newTemp.address}\nAlt Phone: ${newTemp.altPhone}\nInstructions: ${input}\n\n*Items:*\n`;
  let total = 0;

  const dealGroups: Record<string, { items: string[], price: number }> = {};
  const standardItems: string[] = [];

  cart.forEach((c: CartItem) => {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    const itemName = c.name || dbItem?.name || "Item";
    const itemPrice = c.price || dbItem?.basePrice || 0;

    if (c.isDeal && itemName.startsWith("[DEAL:")) {
       const dealMatch = itemName.match(/\[DEAL: (.*?)\] (.*)/);
       if (dealMatch) {
         const dealName = dealMatch[1];
         const slotName = dealMatch[2];
         if (!dealGroups[dealName]) dealGroups[dealName] = { items: [], price: 0 };
         dealGroups[dealName].items.push(`- ${c.quantity}x ${slotName}`);
         dealGroups[dealName].price += (itemPrice * c.quantity);
       } else {
         standardItems.push(`${c.quantity}x ${itemName} (Rs. ${itemPrice})`);
         total += itemPrice * c.quantity;
       }
    } else {
       standardItems.push(`${c.quantity}x ${itemName} (Rs. ${itemPrice})`);
       total += itemPrice * c.quantity;
    }
  });

  for (const [dealName, group] of Object.entries(dealGroups)) {
    summary += `*${dealName}* (Rs. ${group.price})\n`;
    summary += group.items.join("\n") + "\n";
    total += group.price;
  }
  summary += standardItems.join("\n") + (standardItems.length > 0 ? "\n" : "");

  summary += `\nDelivery: Rs. 150\n*Total: Rs. ${total + 150}*\n_Payment: Cash on Delivery_\n\nIs this correct?`;

  await sendWhatsAppInteractiveButtons(phone, summary, [
    { id: "confirm_yes", title: t("Yes, Confirm", session.language) },
    { id: "edit_cart", title: t("Edit/Remove Items", session.language) },
    { id: "confirm_no", title: t("Cancel Order", session.language) }
  ]);

  return updateSessionState(session.id, "order_confirmation", session.cart, newTemp);
}

async function handleConfirmation(phone: string, session: any, input: string) {
  // Fuzzy Intent Normalizer
  const yesWords = ["yes", "haan", "han", "g", "ji", "jee", "confirm", "1", "ok", "yep"];
  const noWords = ["no", "nahi", "nai", "cancel", "2", "nah"];
  
  if (input === "confirm_yes" || yesWords.includes(input)) {
     input = "confirm_yes";
  } else if (input === "confirm_no" || noWords.includes(input)) {
     input = "confirm_no";
  }

  if (input === "confirm_yes") {
    try {
      const order = await createOrderFromWhatsApp(phone, session.restaurantId);
      if ((order as any).isDuplicate) {
        await sendWhatsAppText(phone, t(`✅ Your order is already received. Order #${order.orderId} is being processed.`, session.language));
        await updateSessionState(session.id, "order_created", [], {});
        return;
      }
      // The outbound message is queued atomically inside createOrderFromWhatsApp
    } catch (error: any) {
      console.error("Order creation failed:", error);
      let errMsg = `Maafi chahta hoon, aapka order process nahi ho saka kyunke kuch masla aaya hai. Barae meharbani dubara koshish karein.`;
      
      if (error.message.includes("is currently unavailable")) {
        const itemMatch = error.message.replace("Sorry, ", "").replace(" is currently unavailable.", "");
        errMsg = `Maafi chahta hoon, aapka order process nahi ho saka kyunke ${itemMatch} abhi out of stock ho gaya hai. Barae meharbani menu se koi aur item select karein.`;
      }
      
      await sendWhatsAppText(phone, errMsg);
      await updateSessionState(session.id, "greeting", [], {});
    }
  } else if (input === "confirm_no") {
    await sendWhatsAppText(phone, t("Order cancelled. Type 'Hi' anytime to start over and order again.", session.language));
    await updateSessionState(session.id, "cancelled", [], {});
  } else if (input === "edit_cart") {
    const cart = session.cart as any[];
    if (cart.length === 0) {
      await sendWhatsAppText(phone, t("Your cart is empty. Please select an item from the menu first.", session.language));
      return updateSessionState(session.id, "greeting", [], {});
    }
    const rows = cart.slice(0, 9).map((c, index) => {
      let displayName = c.name || "Item";
      if (c.isDeal) {
        const m = displayName.match(/\[DEAL: (.*?)\]/);
        if (m) displayName = `${m[1]} Item`;
      }
      return {
        id: `rm_${index}`,
        title: `Remove: ${displayName.substring(0, 15)}`,
        description: `Qty: ${c.quantity} - Rs. ${c.price}`
      };
    });
    await sendWhatsAppInteractiveList(phone, "Select an item to remove from your cart:", "Remove Items", [{ title: "Cart Items", rows }]);
    return updateSessionState(session.id, "cart_edit", session.cart, session.tempData);
  } else {
    const checkoutSessionId = "chk_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    const newTemp = { ...(session.tempData as any), checkoutSessionId };
    await sendWhatsAppInteractiveButtons(phone, t("Please confirm your order.", session.language), [
      { id: "confirm_yes", title: t("Yes, Confirm", session.language) },
      { id: "edit_cart", title: t("Edit/Remove Items", session.language) },
      { id: "confirm_no", title: t("Cancel Order", session.language) }
    ]);
    return updateSessionState(session.id, "order_confirmation", session.cart, newTemp);
  }
}

async function handleCartEdit(phone: string, session: any, input: string) {
  if (input.startsWith("rm_")) {
    const index = parseInt(input.replace("rm_", ""));
    const cart = session.cart as any[];
    if (index >= 0 && index < cart.length) {
      cart.splice(index, 1);
      await sendWhatsAppText(phone, "Item cart se remove kar diya gaya hai.");
    }
    
    if (cart.length === 0) {
      await sendWhatsAppText(phone, t("Your cart is empty. Please select an item from the menu first.", session.language));
      return updateSessionState(session.id, "greeting", [], {});
    }

    // Go back to instructions/summary calculation
    return handleInstructionsInput(phone, session, session.tempData.instructions || "none");
  }

  // If they send something else, send them back to summary
  return handleInstructionsInput(phone, session, session.tempData.instructions || "none");
}


async function handleMacroSelection(phone: string, session: any, input: string) {
  if (input.startsWith("macro_deals")) {
    const page = parseInt(input.split("_page_")[1] || "1");
    const activeDeals = await db.query.deals.findMany({ where: eq(deals.isActive, true) });
    if (activeDeals.length === 0) {
      await sendWhatsAppText(phone, "No active deals right now. Check back later!");
      return handleGreeting(phone, session);
    }
    const rows = getPaginatedRows(activeDeals, page, "macro_deals", (d: any) => ({
      id: `deal_${d.id}`, title: d.name.substring(0, 24), description: `Rs. ${d.dealPrice}`
    }));
    await sendWhatsAppInteractiveList(phone, "Check out our exclusive Deals & Combos! 🎉", "View Deals", [{ title: "Deals", rows }]);
    return updateSessionState(session.id, "deal_builder", session.cart, session.tempData);
  }

  if (input.startsWith("macro_menu")) {
    const page = parseInt(input.split("_page_")[1] || "1");
    const allCategories = await db.select().from(categories).where(eq(categories.isActive, true));
    const foodCats = allCategories.filter((c: any) =>
      !c.name.toLowerCase().includes("drink") && !c.name.toLowerCase().includes("beverage") &&
      !c.name.toLowerCase().includes("dessert") && !c.name.toLowerCase().includes("ice cream")
    );
    const rows = getPaginatedRows(foodCats, page, "macro_menu", (c: any) => ({
      id: `cat_${c.id}`, title: c.name.substring(0, 24), description: "Tap to view items"
    }));
    await sendWhatsAppInteractiveList(phone, "What are you craving? 🍔", "View Categories", [{ title: "Categories", rows }]);
    return updateSessionState(session.id, "category_selection", session.cart, session.tempData);
  }

  if (input === "macro_desserts") return handleItemSelection(phone, session, "show_desserts");
  if (input === "macro_drinks") return handleItemSelection(phone, session, "drinks");

  return handleGreeting(phone, session);
}

async function handleDealBuilder(phone: string, session: any, input: string) {
  if (input.startsWith("macro_deals_page_")) {
    return handleMacroSelection(phone, session, input);
  }

  if (input.startsWith("deal_")) {
    const dealId = input.replace("deal_", "");
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: { slots: { orderBy: (slots: any, { asc }: any) => [asc(slots.createdAt)] } }
    });
    if (!deal) return sendWhatsAppText(phone, "Deal not found.");

    const newTemp = {
      ...(session.tempData as any),
      deal_builder: {
        dealId: deal.id,
        dealName: deal.name,
        dealPrice: deal.dealPrice,
        slots: deal.slots,
        currentIndex: 0,
        selections: []
      }
    };
    if (deal.description) {
      await sendWhatsAppText(phone, `*${deal.name}*\n_${deal.description}_`);
    }
    return processDealSlot(phone, session, newTemp);
  }

  if (input.startsWith("dbuild_item_")) {
    const itemId = input.replace("dbuild_item_", "");
    const builder = (session.tempData as any).deal_builder;
    const currentSlot = builder.slots[builder.currentIndex];

    const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, itemId));
    let selectedVariantId = null;

    if (variants.length > 0) {
      if (currentSlot.requiredVariantName) {
        const requiredVar = variants.find((v: any) => v.name.toLowerCase() === currentSlot.requiredVariantName.toLowerCase());
        if (requiredVar) {
          selectedVariantId = requiredVar.id;
        } else {
           selectedVariantId = variants[0].id;
        }
      } else {
         // Auto-select first variant if no requirement but variant exists (to reduce friction)
         selectedVariantId = variants[0].id;
      }
    }

    builder.selections.push({
      slotName: currentSlot.slotName,
      menuItemId: itemId,
      variantId: selectedVariantId,
      quantity: currentSlot.quantity
    });
    builder.currentIndex++;

    return processDealSlot(phone, session, session.tempData);
  }

  if (input.startsWith("dbuild_cat_")) {
     const parts = input.split("_page_");
     const catId = parts[0].replace("dbuild_cat_", "");
     const page = parseInt(parts[1] || "1");
     return sendSlotCategoryOptions(phone, session, catId, page);
  }
}

async function processDealSlot(phone: string, session: any, newTemp: any): Promise<void> {
  const builder = newTemp.deal_builder;

  if (builder.currentIndex >= builder.slots.length) {
    const cart = session.cart || [];
    const slotCount = builder.slots.reduce((s: number, i: any) => s + i.quantity, 0);
    const pricePerSlot = slotCount > 0 ? Math.floor(builder.dealPrice / slotCount) : builder.dealPrice;

    for (const sel of builder.selections) {
       cart.push({
         menuItemId: sel.menuItemId,
         variantId: sel.variantId,
         quantity: sel.quantity,
         name: `[DEAL: ${builder.dealName}] ${sel.slotName}`,
         price: pricePerSlot,
         specialInstructions: `[DEAL: ${builder.dealName}]`,
         isDeal: true
       });
    }
    newTemp.deal_builder = undefined;
    await sendWhatsAppText(phone, `✅ Added *${builder.dealName}* to your cart!`);

    await sendWhatsAppInteractiveButtons(
      phone,
      `What would you like to do next?`,
      [
        { id: "checkout", title: "Checkout Now" },
        { id: "menu", title: "View Menu" }
      ]
    );
    await updateSessionState(session.id, "item_selection", cart, newTemp);
    return;
  }

  const slot = builder.slots[builder.currentIndex];

  if (slot.menuItemId) {
    let variantId = null;
    if (slot.requiredVariantName) {
       const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, slot.menuItemId));
       const requiredVar = variants.find((v: any) => v.name.toLowerCase() === slot.requiredVariantName.toLowerCase());
       if (requiredVar) variantId = requiredVar.id;
    }

    builder.selections.push({
      slotName: slot.slotName,
      menuItemId: slot.menuItemId,
      variantId,
      quantity: slot.quantity
    });
    builder.currentIndex++;
    return processDealSlot(phone, session, newTemp);
  }

  if (slot.categoryId) {
    session.tempData = newTemp;
    await updateSessionState(session.id, "deal_builder", session.cart, newTemp);
    return sendSlotCategoryOptions(phone, session, slot.categoryId, 1);
  }
}

async function sendSlotCategoryOptions(phone: string, session: any, catId: string, page: number): Promise<void> {
  const builder = (session.tempData as any).deal_builder;
  const slot = builder.slots[builder.currentIndex];

  const items = await db.select().from(menuItems).where(eq(menuItems.categoryId, catId));
  const activeItems = items.filter((i: any) => i.isAvailable);

  let validItems = activeItems;
  if (slot.requiredVariantName) {
    const allVariants = await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, validItems.map((i: any) => i.id)));
    const itemsWithRequiredVariant = allVariants
       .filter((v: any) => v.name.toLowerCase() === slot.requiredVariantName.toLowerCase())
       .map((v: any) => v.menuItemId);
    validItems = validItems.filter((i: any) => itemsWithRequiredVariant.includes(i.id));
  }

  if (validItems.length === 0) {
     await sendWhatsAppText(phone, `Sorry, no available options for ${slot.slotName}.`);
     builder.currentIndex++;
     return processDealSlot(phone, session, session.tempData);
  }

  if (validItems.length === 1 && page === 1) {
      let variantId = null;
      if (slot.requiredVariantName) {
         const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, validItems[0].id));
         const requiredVar = variants.find((v: any) => v.name.toLowerCase() === slot.requiredVariantName.toLowerCase());
         if (requiredVar) variantId = requiredVar.id;
      }
      builder.selections.push({
        slotName: slot.slotName,
        menuItemId: validItems[0].id,
        variantId,
        quantity: slot.quantity
      });
      builder.currentIndex++;
      return processDealSlot(phone, session, session.tempData);
  }

  const rows = getPaginatedRows(validItems, page, `dbuild_cat_${catId}`, (i: any) => ({
    id: `dbuild_item_${i.id}`,
    title: i.name.substring(0, 24),
    description: `Select for ${slot.slotName}`
  }));

  await sendWhatsAppInteractiveList(
    phone,
    `Combo Builder: Please choose an option for *${slot.slotName}* (${builder.currentIndex + 1}/${builder.slots.length})`,
    "Choose Option",
    [{ title: "Options", rows }]
  );
}

async function updateSessionState(id: string, state: any, cart: any[], tempData: any) {
  await db.update(whatsappSessions)
    .set({ state, cart, tempData, updatedAt: new Date() })
    .where(eq(whatsappSessions.id, id));
}
