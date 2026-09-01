import { db } from "@/database/db";
import { whatsappSessions, menuItems, categories, itemVariants, orders, orderItems } from "@/database/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { sendWhatsAppText, sendWhatsAppInteractiveList, sendWhatsAppInteractiveButtons, sendWhatsAppImage, downloadWhatsAppMedia } from "./client";
import { transcribeVoiceNote } from "./ai-helper";
import { createOrderFromWhatsApp } from "@/server/actions/whatsapp-orders";

function t(en: string, lang: string = "en"): string {
  if (lang === "en") return en;
  const dict: Record<string, string> = {
    "Welcome to Classy Crave! What can I do for you today? 🍔 Please select a category:": "Classy Crave mein khush aamdeed! 🍔 Baraye meharbani category select karein:",
    "What else would you like to add? 🍔 Please select a category:": "Aap mazeed kya add karna chahenge? 🍔 Category select karein:",
    "Your cart is empty. Please select an item from the menu first.": "Aapka cart khali hai. Pehle menu se koi item select karein.",
    "Sorry, we are currently closed or out of stock.": "Maazrat, hum abhi band hain ya stock khatam hai.",
    "Tap to view items": "Items dekhne ke liye tap karein",
    "Menu Categories": "Menu Categories",
    "Categories": "Categories",
    "View Items": "Items Dekhein",
    "Checkout Now": "Checkout Karein",
    "View Menu Again": "Menu Dobara Dekhein",
    "Yes, Show Deals/Drinks": "Haan, Deals/Drinks Dikhayein",
    "Yes, Show Drinks": "Haan, Drinks Dikhayein",
    "Yes, Show me!": "Haan, Dikhayein!",
    "No thanks, Checkout": "Nahi shukriya, Checkout karein",
    "Got it! Please provide your active CALLING number (not just your WhatsApp number) so the rider can reach you.": "Theek hai! Baraye meharbani apna active CALLING number batayein (sirf WhatsApp nahi) taake rider aap se raabta kar sake.",
    "Use Previous": "Pichli Tafseelat Use Karein",
    "Enter New": "Nayi Tafseelat Darj Karein"
  };
  
  if (dict[en]) return dict[en];
  
  if (en.includes("to cart! Would you like to try our special")) {
    return en.replace("Added", "Add kar diya:").replace("to cart! Would you like to try our special Crown Crust Pizza with that?", "cart mein! Kya aap hamara special Crown Crust Pizza try karna chahenge?");
  }
  if (en.includes("to cart! How about a sweet dessert")) {
    return en.replace("Added", "Add kar diya:").replace("to cart! How about a sweet dessert to go with your meal?", "cart mein! Khane ke baad kuch meetha ho jaye?");
  }
  if (en.includes("to cart! Would you like a cold refreshing drink with that?")) {
    return en.replace("Added", "Add kar diya:").replace("to cart! Would you like a cold refreshing drink with that?", "cart mein! Kya aap iske sath thandi cold drink lena pasand karenge?");
  }
  if (en.includes("to cart! Anything else?")) {
    return en.replace("Added", "Add kar diya:").replace("to cart! Anything else?", "cart mein! Aur kuch?");
  }
  if (en.includes("How many")) {
    return en.replace("How many", "Aap kitne").replace("would you like? (Tap a number or type your quantity)", "lena chahenge? (Number tap karein ya type karein)");
  }
  if (en.includes("Before you checkout, would you like a sweet dessert or Ice Cream to complete your meal?")) {
    return "Checkout karne se pehle, kya aap apne khane ke baad kuch meetha (Dessert / Ice Cream) lena pasand karenge?";
  }
  if (en.includes("Great! Please reply with your full delivery address")) {
    return "Zabardast! Baraye meharbani apna mukammal delivery address (jaise House 12, Street 4, Sector F) type karein, YA 📎 Attachment icon daba kar apni Location share karein.";
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
    return "Zabardast! Akhri sawal, aapka mukammal naam kya hai?";
  }
  if (en.includes("Order cancelled. Type 'Hi' anytime to start over and order again.")) {
    return "Order cancel kar diya gaya hai. Jab bhi naya order karna ho, bas 'Hi' bhejein.";
  }
  if (en.includes("Please confirm your order.")) {
    return "Baraye meharbani apna order confirm karein.";
  }
  
  if (en.includes("You have an active order (#")) {
    return en.replace("You have an active order (#", "Aapka ek order (#")
             .replace(") currently being processed. What would you like to do?", ") pehle se active hai. Aap kya karna chahenge?");
  }
  if (en.includes("Welcome back to Classy Crave! Would you like to repeat your last order or see the menu?")) {
    return "Classy Crave mein wapas khush aamdeed! Kya aap apna pichla order repeat karna chahenge ya naya menu dekhna chahenge?";
  }
  if (en.includes("Sorry, your order has already been accepted by the kitchen and cannot be cancelled via WhatsApp. Please call the restaurant.")) {
    return "Maazrat, aapka order kitchen mein ban raha hai aur ab WhatsApp se cancel nahi ho sakta. Baraye meharbani restaurant ko call karein.";
  }
  
  if (en.includes("🎉 Order confirmed! Your Order ID is #")) {
    return en.replace("Order confirmed! Your Order ID is #", "Zabardast! Aapka Order confirm ho gaya hai! Aapka Order ID # hai: ")
             .replace("Track your delivery here:", "Apni delivery yahan track karein:")
             .replace("Type 'Hi' anytime if you'd like to place another order!", "Naya order karne ke liye kisi bhi waqt 'Hi' bhejein!");
  }
  
  return en;
}

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
  }
  
  // 2. Extract Message Intent
  const textBody = message.text?.body?.toLowerCase().trim() || "";
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

      case "greeting":
      case "expired":
      case "order_created":
      case "cancelled":
        await handleGreeting(phone, session, false);
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
    ? t("What else would you like to add? 🍔 Please select a category:", session.language) 
    : t("Welcome to Classy Crave! What can I do for you today? 🍔 Please select a category:", session.language);

  if (showImages) {
    const baseUrl = "https://agency-fast.vercel.app";
    await Promise.all([
      sendWhatsAppImage(phone, `${baseUrl}/Menu/Deals.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/Menu/IceCreams.jpeg`),
      sendWhatsAppImage(phone, `${baseUrl}/Menu/Items.jpeg`)
    ]);
  }

  await Promise.all([
    sendWhatsAppInteractiveList(
      phone,
      greetingText,
      t("Menu Categories", session.language),
      [{ title: t("Categories", session.language), rows }]
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
      if ((order as any).isDuplicate) {
        await sendWhatsAppText(phone, t(`✅ Your order is already received. Order #${order.orderId} is being processed.`, session.language));
        await updateSessionState(session.id, "order_created", [], {});
        return;
      }
      // The outbound message is queued atomically inside createOrderFromWhatsApp
    } catch (error: any) {
      console.error("Order creation failed:", error);
      await sendWhatsAppText(phone, `Sorry, we couldn't place your order: ${error.message}`);
      await updateSessionState(session.id, "greeting", [], {});
    }
  } else if (input === "confirm_no" || input === "no" || input === "cancel") {
    await sendWhatsAppText(phone, t("Order cancelled. Type 'Hi' anytime to start over and order again.", session.language));
    await updateSessionState(session.id, "cancelled", [], {});
  } else {
    const checkoutSessionId = "chk_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    const newTemp = { ...(session.tempData as any), checkoutSessionId };
    await sendWhatsAppInteractiveButtons(phone, t("Please confirm your order.", session.language), [
      { id: "confirm_yes", title: "Yes, Confirm" },
      { id: "confirm_no", title: "Cancel Order" }
    ]);
    return updateSessionState(session.id, "order_confirmation", session.cart, newTemp);
  }
}

async function updateSessionState(id: string, state: any, cart: any[], tempData: any) {
  await db.update(whatsappSessions)
    .set({ state, cart, tempData, updatedAt: new Date() })
    .where(eq(whatsappSessions.id, id));
}
