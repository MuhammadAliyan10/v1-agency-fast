/**
 * WhatsApp Order Bot — Processor
 *
 * Complete state-machine for Classy Crave's WhatsApp ordering flow.
 *
 * Design principles:
 *  - Smart, context-aware greetings (salam → walaikum, hi → hello, returning customer aware)
 *  - Language selected once, remembered forever for that customer
 *  - Website URL promoted exactly ONCE per session (tracked via tempData.websitePromoted)
 *  - Menu images shown exactly ONCE ever (tracked via tempData.menuImagesSent)
 *  - Product cards show real image + name + description + price
 *  - Deals show image, description, then slot-by-slot configuration
 *  - Off-topic messages handled gracefully (food query → menu, complaint → human, thanks → warm reply)
 *  - Cart view available from any state via "cart" command
 *  - Pickup support alongside delivery
 *  - Post-order alert subscription (stored in tempData.alertsSubscribed)
 *  - No emojis in body text — WhatsApp *bold* and _italic_ formatting only
 *  - Clean Roman Urdu — simple everyday words, no heavy vocabulary
 */

import { db } from "@/database/db";
import {
  whatsappSessions,
  menuItems,
  categories,
  itemVariants,
  orders,
  orderItems,
  deals,
  storeSettings,
} from "@/database/schema";
import { eq, sql, inArray, desc } from "drizzle-orm";
import {
  sendWhatsAppText,
  sendWhatsAppInteractiveList,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppImage,
  downloadWhatsAppMedia,
  sendWhatsAppItemCard,
} from "./client";
import { transcribeVoiceNote } from "./ai-helper";
import { createOrderFromWhatsApp } from "@/server/actions/whatsapp-orders";
import { cancelLiveOrder } from "@/server/actions/live-orders";
import { STORE_CONSTANTS } from "@/lib/constants";

// ─── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = STORE_CONSTANTS.STOREFRONT_URL;

// ─── Types ──────────────────────────────────────────────────────────────────────

type AppSession = typeof whatsappSessions.$inferSelect;

type CartItem = {
  menuItemId: string | null;
  variantId?: string | null;
  quantity: number;
  name?: string;
  price?: number;
  isDeal?: boolean;
  specialInstructions?: string;
};

type SlotSelection = {
  slotName: string;
  menuItemId: string;
  variantId: string | null;
  quantity: number;
};

type DealBuilder = {
  dealId: string;
  dealName: string;
  dealPrice: number;
  // Using unknown[] for the raw Drizzle slot objects — we only read typed sub-fields
  slots: unknown[];
  currentIndex: number;
  selections: SlotSelection[];
};

type TempData = {
  name?: string;
  address?: string;
  lat?: number | null;
  long?: number | null;
  altPhone?: string;
  instructions?: string;
  checkoutSessionId?: string;
  activeOrderId?: string;
  activeOrderStatus?: string;
  pastOrderId?: string;
  previousOrder?: Record<string, unknown>;
  pendingCartItem?: {
    menuItemId: string;
    variantId: string | null;
    name: string;
    price: number;
    categoryId: string;
  };
  pendingItemId?: string;
  deal_builder?: DealBuilder;
  menuImagesSent?: boolean;
  websitePromoted?: boolean;
  dessertPitched?: boolean;
  alertsSubscribed?: boolean;
  orderType?: "delivery" | "pickup";
};

// ─── WhatsApp slot type (returned by Drizzle with-relations) ─────────────────

type DBSlot = {
  id: string;
  slotName: string;
  quantity: number;
  menuItemId?: string | null;
  categoryId?: string | null;
  requiredVariantName?: string | null;
  menuItem?: {
    id: string;
    name: string;
    variants?: { id: string; name: string; price: number; isAvailable?: boolean | null }[];
  } | null;
  category?: {
    id: string;
    name: string;
    menuItems?: {
      id: string;
      name: string;
      basePrice: number;
      imageUrl?: string | null;
      isAvailable?: boolean | null;
      variants?: { id: string; name: string; price: number; isAvailable?: boolean | null }[];
    }[];
  } | null;
};

// ─── Pagination helper ───────────────────────────────────────────────────────

function getPaginatedRows<T extends { id: string }>(
  items: T[],
  page: number,
  prefix: string,
  mapFn: (item: T) => { id: string; title: string; description?: string }
): { id: string; title: string; description?: string }[] {
  const limit = 9;
  const start = (page - 1) * limit;
  const sliced = items.slice(start, start + limit);
  const rows = sliced.map(mapFn);
  if (items.length > start + limit) {
    rows.push({ id: `${prefix}_page_${page + 1}`, title: "Aage Dekhein", description: "Aur options" });
  }
  return rows;
}

// ─── Smart greeting ──────────────────────────────────────────────────────────
//
// Returns the right opening based on what the user typed.

function getSmartGreeting(rawInput: string, lang: string, isReturning: boolean): string {
  const l = rawInput.trim().toLowerCase();

  // Islamic greetings
  const isIslamic =
    l.includes("assalamu") || l.includes("assalam") || l.includes("salam") ||
    l.includes("aslam") || l.includes("asslam") || l === "aoa" || l === "s" || l === "slm";

  if (isIslamic) {
    return lang === "ur"
      ? "Wa Alaikum Assalam! Classy Crave mein khush aamdeed."
      : "Wa Alaikum Assalam! Welcome to Classy Crave.";
  }

  // Returning customer
  if (isReturning) {
    return lang === "ur"
      ? "Dobara aana acha laga. Aaj kya lena chahenge?"
      : "Good to see you again! What would you like today?";
  }

  // Standard greetings
  if (["hi", "hello", "hey", "heyy", "hii"].includes(l)) {
    return lang === "ur" ? "Hello! Classy Crave mein aapka swaagat hai." : "Hello! Welcome to Classy Crave.";
  }

  if (l.includes("good morning") || l.includes("morning")) {
    return lang === "ur" ? "Subh bakher! Aaj kya order karein?" : "Good morning! Ready to order?";
  }
  if (l.includes("good evening") || l.includes("evening")) {
    return lang === "ur" ? "Shaam bakher! Kya pasand hai?" : "Good evening! What can I get you?";
  }
  if (l.includes("good afternoon") || l.includes("afternoon")) {
    return lang === "ur" ? "Dopeher bakher! Kya order karein?" : "Good afternoon! Ready to order?";
  }

  return lang === "ur"
    ? "Classy Crave mein aapka swaagat hai."
    : "Welcome to Classy Crave.";
}

// ─── Off-topic detector ──────────────────────────────────────────────────────

type OffTopicCategory = "complaint" | "thanks" | "other";

function detectOffTopic(input: string): OffTopicCategory | null {
  const l = input.toLowerCase();

  // Things that are always on-topic — let state machine handle
  const onTopicPrefixes = [
    "item_", "cat_", "deal_", "macro_", "var_", "dbuild_",
    "rm_", "qty_", "lang_", "view_item_", "active_", "reorder_",
    "confirm_", "session_", "checkout", "use_prev", "use_new",
    "show_desserts", "final_checkout", "drinks", "order_", "alert_",
  ];
  for (const p of onTopicPrefixes) if (l.startsWith(p)) return null;

  const foodWords = ["burger", "pizza", "zinger", "deal", "combo", "drink", "menu", "food", "order", "khana", "khanaa", "item"];
  if (foodWords.some(w => l.includes(w))) return null; // On-topic food query

  const complaintWords = ["late", "delay", "problem", "issue", "complaint", "wrong", "bad", "ganda", "ghalt", "mushkil", "kharab"];
  if (complaintWords.some(w => l.includes(w))) return "complaint";

  const thanksWords = ["thanks", "thank you", "shukriya", "jazakallah", "jazak", "thx", "ty", "shukria", "meherbani"];
  if (thanksWords.some(w => l.includes(w))) return "thanks";

  if (input.length > 80) return "complaint"; // Long unstructured message likely a complaint

  return "other";
}

// ─── Cart summary ────────────────────────────────────────────────────────────

async function buildCartSummary(cart: CartItem[], lang: string): Promise<string> {
  if (cart.length === 0) {
    return lang === "ur"
      ? "Aapka cart khali hai. Order karne ke liye *Menu* likhein."
      : "Your cart is empty. Type *Menu* to start ordering.";
  }

  const itemIds = cart.map(c => c.menuItemId).filter((id): id is string => id !== null);
  const dbItems = itemIds.length > 0
    ? await db.select().from(menuItems).where(inArray(menuItems.id, itemIds))
    : [];

  let subtotal = 0;
  const lines: string[] = [];

  for (const c of cart) {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    const name = (c.name ?? dbItem?.name ?? "Item").replace(/^\[DEAL: .*?\]\s*/, "");
    const price = c.price ?? dbItem?.basePrice ?? 0;
    const lineTotal = price * c.quantity;
    subtotal += lineTotal;
    lines.push(`${c.quantity}x *${name}* — Rs. ${lineTotal}`);
  }

  const deliveryFee = STORE_CONSTANTS.WHATSAPP_DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  return [
    lang === "ur" ? "*Aapka Cart*" : "*Your Cart*",
    "",
    ...lines,
    "",
    `${lang === "ur" ? "Delivery" : "Delivery"}: Rs. ${deliveryFee}`,
    `*${lang === "ur" ? "Total" : "Total"}: Rs. ${total}*`,
  ].join("\n");
}

// ─── Help message ────────────────────────────────────────────────────────────

function getHelpMessage(lang: string): string {
  if (lang === "ur") {
    return [
      "*Yeh commands use kar sakte hain:*",
      "",
      "*Menu* — Poora menu dekhein",
      "*Deals* — Aaj ki deals dekhein",
      "*Cart* — Apna cart dekhein",
      "*Status* — Order ki status check karein",
      "*Cancel* — Order cancel karein",
      "*Alerts on* — Order updates on karein",
      "*Alerts off* — Order updates band karein",
      "*Human* — Hamare staff se baat karein",
      "*Help* — Yeh list dobara dekhein",
    ].join("\n");
  }
  return [
    "*Available commands:*",
    "",
    "*Menu* — Browse our full menu",
    "*Deals* — See today's special deals",
    "*Cart* — View your cart",
    "*Status* — Check your order status",
    "*Cancel* — Cancel your order",
    "*Alerts on* — Enable order update notifications",
    "*Alerts off* — Disable notifications",
    "*Human* — Speak to our team",
    "*Help* — Show this list",
  ].join("\n");
}

// ─── Session state helper ────────────────────────────────────────────────────

async function updateSessionState(
  id: string,
  state: AppSession["state"],
  cart: CartItem[],
  tempData: TempData
): Promise<void> {
  // Map CartItem[] to the schema's expected cart shape (menuItemId must be string, not null)
  const schemaCart = cart
    .filter(c => c.menuItemId !== null)
    .map(c => ({ menuItemId: c.menuItemId as string, variantId: c.variantId ?? undefined, quantity: c.quantity }));
  await db
    .update(whatsappSessions)
    .set({ state, cart: schemaCart, tempData, updatedAt: new Date() })
    .where(eq(whatsappSessions.id, id));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function processWhatsAppMessage(
  phone: string,
  message: Record<string, unknown>,
  _contact: unknown
): Promise<void> {
  const restaurantId = "default";

  // ── 1. Get or create session ───────────────────────────────────────────────
  const sessionList = await db
    .select()
    .from(whatsappSessions)
    .where(sql`${whatsappSessions.restaurantId} = ${restaurantId} AND ${whatsappSessions.phone} = ${phone}`);

  let session = sessionList[0];

  if (!session) {
    const [newSession] = await db
      .insert(whatsappSessions)
      .values({ restaurantId, phone, state: "language_selection", cart: [], tempData: {}, language: "en" })
      .returning();
    session = newSession;
  } else {
    // 2-hour inactivity timeout — reset to greeting, keep language preference
    const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;
    if (
      session.updatedAt &&
      Date.now() - session.updatedAt.getTime() > SESSION_TIMEOUT_MS &&
      session.state !== "greeting" &&
      session.state !== "language_selection" &&
      session.state !== "order_created" &&
      session.state !== "human_handoff"
    ) {
      await db
        .update(whatsappSessions)
        .set({ state: "greeting", cart: [], tempData: {}, updatedAt: new Date() })
        .where(eq(whatsappSessions.id, session.id));
      session = { ...session, state: "greeting", cart: [], tempData: {} };
    }
  }

  const tempData = (session.tempData ?? {}) as TempData;
  const lang = session.language ?? "en";

  // ── 2. Check store open ────────────────────────────────────────────────────
  const settingsRows = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.key, "is_accepting_orders"));
  const isAcceptingOrders = settingsRows.length > 0 ? settingsRows[0].value === "true" : true;

  // ── 3. Extract input ───────────────────────────────────────────────────────
  const msgType = message.type as string | undefined;
  const interactiveReply =
    (message.interactive as Record<string, Record<string, string>> | undefined)?.list_reply?.id ||
    (message.interactive as Record<string, Record<string, string>> | undefined)?.button_reply?.id;
  const rawText = ((message.text as Record<string, string> | undefined)?.body ?? "").trim();
  const textBodyLower = rawText.toLowerCase();

  let input = interactiveReply ?? textBodyLower;

  // Location pin
  if (msgType === "location") {
    input = "location_payload";
  }

  // Audio / voice note
  if (msgType === "audio" && (message.audio as Record<string, string> | undefined)?.id) {
    const audioId = (message.audio as Record<string, string>).id;
    const buf = await downloadWhatsAppMedia(audioId);
    if (!buf) {
      await db.update(whatsappSessions).set({ updatedAt: new Date() }).where(eq(whatsappSessions.id, session.id));
      await sendWhatsAppText(phone, lang === "ur"
        ? "Voice note download nahi ho saka. Baraye meharbani type karein."
        : "Could not download your voice note. Please type your message instead.");
      return;
    }
    const transcript = await transcribeVoiceNote(buf);
    if (!transcript) {
      await db.update(whatsappSessions).set({ updatedAt: new Date() }).where(eq(whatsappSessions.id, session.id));
      await sendWhatsAppText(phone, lang === "ur"
        ? "Voice note samajh nahi aaya. Baraye meharbani type karein."
        : "Could not understand your voice note. Please type instead.");
      return;
    }
    input = transcript.trim().toLowerCase();
  }

  // Unsupported type (image, sticker, document, reaction)
  if (!input) {
    await db.update(whatsappSessions).set({ updatedAt: new Date() }).where(eq(whatsappSessions.id, session.id));
    await sendWhatsAppText(phone, lang === "ur"
      ? "Sirf text, voice note aur location pin samajh aata hai. Baraye meharbani type karein."
      : "I can only process text, voice notes, and location pins. Please type your message.");
    return;
  }

  // ── 4. Global commands — work from any state ───────────────────────────────

  // Human handoff
  if (["human", "agent", "talk to staff", "staff", "baat karni hai", "call me"].includes(input)) {
    await db.update(whatsappSessions)
      .set({ state: "human_handoff", updatedAt: new Date() })
      .where(eq(whatsappSessions.id, session.id));
    await sendWhatsAppText(phone, lang === "ur"
      ? "Hamare team se connect kar rahe hain. Thodi dair mein jawab milega."
      : "Connecting you to our team. Someone will reply to you shortly.");
    return;
  }

  if (session.state === "human_handoff") return; // Staff is handling — ignore bot

  // Alert subscription toggle
  if (
    input.includes("alerts on") || input === "alert on" || input === "notifications on" ||
    input === "alert_yes"
  ) {
    const newTemp: TempData = { ...tempData, alertsSubscribed: true };
    await updateSessionState(session.id, session.state, (session.cart ?? []) as CartItem[], newTemp);
    await sendWhatsAppText(phone, lang === "ur"
      ? "Aapko ab order updates yahan milenge. Band karne ke liye *Alerts off* likhein."
      : "You will now receive order updates here. Type *Alerts off* to disable.");
    return;
  }
  if (
    input.includes("alerts off") || input === "alert off" || input === "stop alerts" ||
    input === "stop" || input === "unsubscribe" || input === "alert_no"
  ) {
    const newTemp: TempData = { ...tempData, alertsSubscribed: false };
    await updateSessionState(session.id, session.state, (session.cart ?? []) as CartItem[], newTemp);
    await sendWhatsAppText(phone, lang === "ur"
      ? "Notifications band ho gayi. Dobara on karne ke liye *Alerts on* likhein."
      : "Notifications turned off. Type *Alerts on* to re-enable.");
    return;
  }

  // Cart view
  if (["cart", "mera cart", "my cart", "cart dekhein", "basket"].includes(input)) {
    const summary = await buildCartSummary((session.cart ?? []) as CartItem[], lang);
    const hasItems = (session.cart ?? []).length > 0;
    if (hasItems) {
      await sendWhatsAppInteractiveButtons(phone, summary, [
        { id: "checkout", title: lang === "ur" ? "Order Karein" : "Checkout" },
        { id: "macro_menu", title: lang === "ur" ? "Aur Items" : "Add More" },
      ]);
    } else {
      await sendWhatsAppText(phone, summary);
    }
    return;
  }

  // Help
  if (input === "help" || input === "madad" || input === "commands" || input === "?") {
    await sendWhatsAppText(phone, getHelpMessage(lang));
    return;
  }

  // Order status
  const isStatusQuery = ["status", "track", "track order", "order status", "where is my order",
    "mera order", "order kahan hai", "order track", "meri order"].some(kw => input === kw || input.includes(kw));
  if (isStatusQuery) {
    const lastOrder = await db.query.orders.findFirst({
      where: eq(orders.customerPhone, phone),
      orderBy: [desc(orders.createdAt)],
    });
    if (!lastOrder) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Koi order nahi mila. Order karne ke liye *Menu* likhein."
        : "No recent orders found. Type *Menu* to place an order.");
      return;
    }
    const statusLabel = lastOrder.status.replace(/_/g, " ").toUpperCase();
    const trackUrl = `${BASE_URL}/track/${lastOrder.id}`;
    await sendWhatsAppText(phone, lang === "ur"
      ? `Order *#${lastOrder.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${lastOrder.totalAmount}\n\nTrack karein: ${trackUrl}`
      : `Order *#${lastOrder.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${lastOrder.totalAmount}\n\nTrack here: ${trackUrl}`);
    return;
  }

  // Global cancel / start over
  if (["cancel", "start over", "shuru se", "dobara", "restart"].includes(input)) {
    await updateSessionState(session.id, "greeting", [], {});
    await sendWhatsAppText(phone, lang === "ur"
      ? "Theek hai. Naya order karne ke liye *Menu* likhein."
      : "No problem. Type *Menu* to start a new order.");
    return;
  }

  // Menu shortcut
  if (["menu", "menu dekhein", "order karna hai", "order", "start"].includes(input)) {
    return handleGreeting(phone, session, false, false);
  }

  // Deals shortcut
  if (["deals", "deal", "combo", "combos", "offer", "offers"].includes(input)) {
    return handleMacroSelection(phone, session, "macro_deals");
  }

  // Store closed — block ordering but allow status/help/track
  if (!isAcceptingOrders && (session.state as string) !== "human_handoff") {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Maafi chahta hoon, restaurant abhi band hai. Thodi dair baad try karein."
      : "Sorry, the restaurant is currently closed. Please try again later.");
    return;
  }

  // ── 5. Language selection ──────────────────────────────────────────────────
  if (session.state === "language_selection") {
    if (input === "lang_en" || input === "1") {
      await db.update(whatsappSessions)
        .set({ language: "en", state: "greeting", updatedAt: new Date() })
        .where(eq(whatsappSessions.id, session.id));
      session = { ...session, language: "en", state: "greeting" };
      return handleGreeting(phone, session, true, true);
    }
    if (input === "lang_ur" || input === "2") {
      await db.update(whatsappSessions)
        .set({ language: "ur", state: "greeting", updatedAt: new Date() })
        .where(eq(whatsappSessions.id, session.id));
      session = { ...session, language: "ur", state: "greeting" };
      return handleGreeting(phone, session, true, true);
    }
    // Any other message — re-prompt language
    await sendWhatsAppInteractiveButtons(phone,
      "Please choose your language:\nBaraye meharbani apni zaban chunein:",
      [{ id: "lang_en", title: "English" }, { id: "lang_ur", title: "Roman Urdu" }]);
    return;
  }

  // ── 6. Greeting / hi / hello detection ────────────────────────────────────
  const isGreetingInput =
    ["hi", "hello", "hey", "heyy", "hii", "restart", "start"].includes(input) ||
    input.includes("salam") || input.includes("assalam") || input === "aoa" ||
    input.startsWith("good morning") || input.startsWith("good evening") || input.startsWith("good afternoon");

  if (isGreetingInput) {
    // Check for active order
    const lastOrder = await db.query.orders.findFirst({
      where: eq(orders.customerPhone, phone),
      orderBy: [desc(orders.createdAt)],
    });

    if (lastOrder && ["pending", "approved", "preparing", "out_for_delivery", "ready_for_pickup", "delayed"].includes(lastOrder.status)) {
      const greetPrefix = getSmartGreeting(rawText || input, lang, true);
      const statusLabel = lastOrder.status.replace(/_/g, " ").toUpperCase();
      const trackUrl = `${BASE_URL}/track/${lastOrder.id}`;
      const msg = lang === "ur"
        ? `${greetPrefix}\n\nAapka ek order pehle se chal raha hai.\n\nOrder: *#${lastOrder.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${lastOrder.totalAmount}\n\nTrack: ${trackUrl}`
        : `${greetPrefix}\n\nYou have an active order.\n\nOrder: *#${lastOrder.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${lastOrder.totalAmount}\n\nTrack: ${trackUrl}`;

      const buttons: { id: string; title: string }[] = [
        { id: "active_track", title: lang === "ur" ? "Track Karein" : "Track Order" },
        { id: "active_new", title: lang === "ur" ? "Naya Order" : "New Order" },
      ];
      if (lastOrder.status === "pending") {
        buttons.push({ id: "active_cancel", title: lang === "ur" ? "Cancel Karein" : "Cancel Order" });
      }
      await sendWhatsAppInteractiveButtons(phone, msg, buttons);
      const newTemp: TempData = { ...tempData, activeOrderId: lastOrder.id, activeOrderStatus: lastOrder.status };
      return updateSessionState(session.id, "active_order_menu", [], newTemp);
    }

    // Delivered order — offer repeat
    if (lastOrder && lastOrder.status === "delivered") {
      const greetPrefix = getSmartGreeting(rawText || input, lang, true);
      const msg = lang === "ur"
        ? `${greetPrefix}\n\nPichli baar aapne order kiya tha. Kya wahi repeat karein ya naya menu dekhein?`
        : `${greetPrefix}\n\nWelcome back! Would you like to repeat your last order or see the menu?`;
      await sendWhatsAppInteractiveButtons(phone, msg, [
        { id: "reorder_yes", title: lang === "ur" ? "Wahi Order" : "Repeat Order" },
        { id: "reorder_no", title: lang === "ur" ? "Naya Menu" : "See Menu" },
      ]);
      const newTemp: TempData = { ...tempData, pastOrderId: lastOrder.id };
      return updateSessionState(session.id, "reorder_menu", [], newTemp);
    }

    // Active session with cart items
    const hasCartItems = (session.cart ?? []).length > 0;
    const inActiveFlow = ["category_selection", "item_selection", "cart_review", "checkout",
      "address_input", "name_input", "deal_builder", "macro_selection"].includes(session.state);
    if (hasCartItems || inActiveFlow) {
      const cartCount = (session.cart ?? []).length;
      const msg = lang === "ur"
        ? `Aapka ek session chal raha hai${cartCount > 0 ? ` (${cartCount} item cart mein)` : ""}. Continue karein?`
        : `You have an active session${cartCount > 0 ? ` (${cartCount} item(s) in cart)` : ""}. Continue or start fresh?`;
      await sendWhatsAppInteractiveButtons(phone, msg, [
        { id: "session_continue", title: lang === "ur" ? "Continue" : "Continue" },
        { id: "session_start_new", title: lang === "ur" ? "Naya Start" : "Start Fresh" },
      ]);
      return updateSessionState(session.id, "session_reset_confirm", (session.cart ?? []) as CartItem[], tempData);
    }

    // Fresh start
    return handleGreeting(phone, { ...session, cart: [], tempData: {} } as AppSession, true, true);
  }

  // ── 7. Confirmation buttons intercepted globally ───────────────────────────
  if (["confirm_yes", "confirm_no", "edit_cart"].includes(input)) {
    return handleConfirmation(phone, session, input);
  }

  // ── 8. State machine ───────────────────────────────────────────────────────
  try {
    switch (session.state) {
      case "active_order_menu":
        await handleActiveOrderMenu(phone, session, input);
        break;

      case "reorder_menu":
        await handleReorderMenu(phone, session, input);
        break;

      case "previous_details_prompt":
        await handlePreviousDetailsPrompt(phone, session, input);
        break;

      case "session_reset_confirm":
        await handleSessionResetConfirm(phone, session, input);
        break;

      case "greeting":
      case "expired":
      case "order_created":
      case "cancelled":
        await handleGreeting(phone, session, false, false);
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
        await handleGreeting(phone, session, false, false);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WhatsApp Processor Error]", msg);
    await sendWhatsAppText(phone, lang === "ur"
      ? "Kuch masla ho gaya. Baraye meharbani *Help* likhein ya dobara try karein."
      : "Something went wrong on our end. Please type *Help* or try again.");
  }
}

// ─── handleGreeting ───────────────────────────────────────────────────────────
//
// showImages  — send menu images; only honoured once per session (menuImagesSent guard)
// showWebsite — include website URL; only shown once per session (websitePromoted guard)

async function handleGreeting(
  phone: string,
  session: AppSession,
  showImages: boolean,
  showWebsite: boolean
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];
  const isReturning = cart.length > 0;

  const baseMsg = isReturning
    ? (lang === "ur" ? "Aur kuch add karna chahte hain?" : "What else would you like to add?")
    : (lang === "ur" ? "Classy Crave mein aapka swaagat hai. Kya order karein?" : "Welcome to Classy Crave. What would you like to order?");

  // Menu images — only ever once
  if (showImages && !td.menuImagesSent) {
    await sendWhatsAppImage(phone, `${BASE_URL}/Menu/Deals.jpeg`);
    await new Promise<void>(r => setTimeout(r, 500));
    await sendWhatsAppImage(phone, `${BASE_URL}/Menu/Items.jpeg`);
    await new Promise<void>(r => setTimeout(r, 500));
    td.menuImagesSent = true;
    session = { ...session, tempData: td };
  }

  // Website URL — once per session
  const promoLine = (!td.websitePromoted && showWebsite)
    ? `\n\n_Website pe bhi order kar sakte hain: ${BASE_URL}_`
    : "";

  if (!td.websitePromoted && showWebsite) {
    td.websitePromoted = true;
    session = { ...session, tempData: td };
  }

  const bodyText = baseMsg + promoLine;

  const menuRows: { id: string; title: string; description?: string }[] = [
    { id: "macro_deals", title: lang === "ur" ? "Deals aur Combos" : "Deals & Combos", description: lang === "ur" ? "Bachat ke saath khana" : "Save big on meals" },
    { id: "macro_menu", title: lang === "ur" ? "Mein Menu" : "Main Menu", description: lang === "ur" ? "Burgers, Pizzas aur ziada" : "Burgers, Pizzas & more" },
    { id: "macro_desserts", title: lang === "ur" ? "Meetha" : "Desserts", description: lang === "ur" ? "Ice Cream aur sweets" : "Ice cream & sweets" },
    { id: "macro_drinks", title: "Drinks", description: lang === "ur" ? "Thanda peena" : "Cold beverages" },
  ];

  await sendWhatsAppInteractiveList(
    phone,
    bodyText,
    lang === "ur" ? "Menu Dekhein" : "View Menu",
    [{ title: lang === "ur" ? "Categories" : "Categories", rows: menuRows }]
  );
  await updateSessionState(session.id, "macro_selection", cart, td);
}

// ─── handleActiveOrderMenu ────────────────────────────────────────────────────

async function handleActiveOrderMenu(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const activeOrderId = td.activeOrderId;

  if (input === "active_track") {
    if (!activeOrderId) {
      await sendWhatsAppText(phone, lang === "ur" ? "Order nahi mila." : "Order not found.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    const order = await db.query.orders.findFirst({ where: eq(orders.id, activeOrderId) });
    if (!order) {
      await sendWhatsAppText(phone, lang === "ur" ? "Order nahi mila." : "Order not found.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    const statusLabel = order.status.replace(/_/g, " ").toUpperCase();
    const trackUrl = `${BASE_URL}/track/${order.id}`;
    const msg = lang === "ur"
      ? `Order *#${order.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${order.totalAmount}\n\nTrack: ${trackUrl}`
      : `Order *#${order.id}*\nStatus: *${statusLabel}*\nTotal: Rs. ${order.totalAmount}\n\nTrack here: ${trackUrl}`;
    const buttons: { id: string; title: string }[] = [
      { id: "active_track", title: lang === "ur" ? "Refresh Karein" : "Refresh Status" },
      { id: "active_new", title: lang === "ur" ? "Naya Order" : "New Order" },
    ];
    if (order.status === "pending") {
      buttons.push({ id: "active_cancel", title: lang === "ur" ? "Cancel" : "Cancel Order" });
    }
    await sendWhatsAppInteractiveButtons(phone, msg, buttons);
    return;
  }

  if (input === "active_new") {
    return handleGreeting(phone, { ...session, cart: [], tempData: {} } as AppSession, false, false);
  }

  if (input === "active_cancel") {
    if (!activeOrderId) {
      await sendWhatsAppText(phone, lang === "ur" ? "Order nahi mila." : "Order not found.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    const freshOrder = await db.query.orders.findFirst({ where: eq(orders.id, activeOrderId) });
    if (!freshOrder) {
      await sendWhatsAppText(phone, lang === "ur" ? "Order nahi mila." : "Order not found.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    if (freshOrder.status !== "pending") {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Maafi chahta hoon, order kitchen mein ja chuka hai. Ab WhatsApp se cancel nahi ho sakta. Restaurant ko call karein: " + STORE_CONSTANTS.PHONE_NUMBER
        : "Sorry, your order is already with the kitchen and cannot be cancelled via WhatsApp. Please call us: " + STORE_CONSTANTS.PHONE_NUMBER);
      return;
    }
    const result = await cancelLiveOrder(activeOrderId, freshOrder.orderVersion, "Customer cancelled via WhatsApp");
    if (result.success) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Order cancel ho gaya. Naya order karne ke liye *Menu* likhein."
        : "Order cancelled. Type *Menu* to place a new order.");
      return updateSessionState(session.id, "cancelled", [], {});
    }
    await sendWhatsAppText(phone, lang === "ur"
      ? "Cancel nahi ho saka. Restaurant ko call karein: " + STORE_CONSTANTS.PHONE_NUMBER
      : "Could not cancel. Please call us: " + STORE_CONSTANTS.PHONE_NUMBER);
    return;
  }

  // Unrecognised input in active_order_menu — re-show the buttons
  const fallbackOrder = await db.query.orders.findFirst({ where: eq(orders.id, td.activeOrderId ?? "") });
  if (fallbackOrder) {
    const statusLabel = fallbackOrder.status.replace(/_/g, " ").toUpperCase();
    const trackUrl = `${BASE_URL}/track/${fallbackOrder.id}`;
    const buttons: { id: string; title: string }[] = [
      { id: "active_track", title: lang === "ur" ? "Track Karein" : "Track Order" },
      { id: "active_new", title: lang === "ur" ? "Naya Order" : "New Order" },
    ];
    if (fallbackOrder.status === "pending") {
      buttons.push({ id: "active_cancel", title: lang === "ur" ? "Cancel" : "Cancel Order" });
    }
    await sendWhatsAppInteractiveButtons(phone,
      lang === "ur"
        ? `Order *#${fallbackOrder.id}* — Status: *${statusLabel}*\n\nTrack: ${trackUrl}`
        : `Order *#${fallbackOrder.id}* — Status: *${statusLabel}*\n\nTrack: ${trackUrl}`,
      buttons
    );
  } else {
    return handleGreeting(phone, session, false, false);
  }
}

// ─── handleReorderMenu ────────────────────────────────────────────────────────

async function handleReorderMenu(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;

  if (input === "reorder_yes") {
    const pastOrderId = td.pastOrderId;
    if (!pastOrderId) return handleGreeting(phone, session, false, false);
    const pastItems = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, pastOrderId) });
    const newCart: CartItem[] = pastItems
      .filter(i => i.menuItemId !== null)
      .map(i => ({ menuItemId: i.menuItemId as string, variantId: i.variantId ?? undefined, quantity: i.quantity }));
    await sendWhatsAppText(phone, lang === "ur"
      ? "Pichla order cart mein add ho gaya."
      : "Your previous order has been added to the cart.");
    await updateSessionState(session.id, "item_selection", newCart, {});
    session = { ...session, cart: newCart.map(c => ({ menuItemId: c.menuItemId as string, variantId: c.variantId ?? undefined, quantity: c.quantity })), tempData: {} };
    return handleItemSelection(phone, session, "checkout");
  }

  if (input === "reorder_no") {
    return handleGreeting(phone, { ...session, cart: [], tempData: {} } as AppSession, false, false);
  }

  // Unrecognised input — re-show the repeat/menu choice
  await sendWhatsAppInteractiveButtons(phone,
    lang === "ur"
      ? "Baraye meharbani ek option chunein:"
      : "Please choose an option:",
    [
      { id: "reorder_yes", title: lang === "ur" ? "Wahi Order" : "Repeat Order" },
      { id: "reorder_no", title: lang === "ur" ? "Naya Menu" : "See Menu" },
    ]
  );
}

// ─── handlePreviousDetailsPrompt ──────────────────────────────────────────────

async function handlePreviousDetailsPrompt(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  if (input === "use_prev") {
    const prev = td.previousOrder as Record<string, unknown>;
    const newTemp: TempData = {
      ...td,
      name: prev.customerName as string,
      address: prev.deliveryAddress as string,
      lat: (prev.latitude as number | null) ?? null,
      long: (prev.longitude as number | null) ?? null,
      altPhone: phone,
    };
    await sendWhatsAppText(phone, lang === "ur"
      ? "Kitchen ke liye koi khaas hidayat? (Agar nahi toh *none* likhein)"
      : "Any special instructions for the kitchen? (Type *none* if not)");
    return updateSessionState(session.id, "checkout", cart, newTemp);
  }

  if (input === "use_new") {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Apna delivery address likhein ya location pin share karein."
      : "Please type your delivery address or share your location pin.");
    return updateSessionState(session.id, "address_input", cart, td);
  }

  // Unrecognised — re-show the use_prev / use_new choice
  const prevOrder = td.previousOrder as Record<string, unknown> | undefined;
  if (prevOrder) {
    await sendWhatsAppInteractiveButtons(phone,
      lang === "ur"
        ? `Pichli details use karein ya nayi dalein?\nNaam: *${prevOrder.customerName}*\nAddress: *${prevOrder.deliveryAddress}*`
        : `Use previous details or enter new ones?\nName: *${prevOrder.customerName}*\nAddress: *${prevOrder.deliveryAddress}*`,
      [
        { id: "use_prev", title: lang === "ur" ? "Haan, Yahi" : "Yes, use these" },
        { id: "use_new", title: lang === "ur" ? "Nayi Details" : "Enter new" },
      ]
    );
  } else {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Apna delivery address likhein ya location pin share karein."
      : "Please type your delivery address or share your location pin.");
    return updateSessionState(session.id, "address_input", cart, td);
  }
}

// ─── handleSessionResetConfirm ────────────────────────────────────────────────

async function handleSessionResetConfirm(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  if (input === "session_continue") {
    if (cart.length > 0) {
      const summary = await buildCartSummary(cart, lang);
      await sendWhatsAppInteractiveButtons(phone, summary, [
        { id: "checkout", title: lang === "ur" ? "Order Karein" : "Checkout" },
        { id: "macro_menu", title: lang === "ur" ? "Aur Items" : "Add More" },
      ]);
      return updateSessionState(session.id, "item_selection", cart, td);
    }
    return handleGreeting(phone, session, false, false);
  }

  if (input === "session_start_new") {
    await sendWhatsAppText(phone, lang === "ur" ? "Naya session shuru." : "Starting fresh.");
    return handleGreeting(phone, { ...session, cart: [], tempData: {} } as AppSession, false, false);
  }

  // Unrecognised — re-show continue/fresh choice
  const cartCount = cart.length;
  await sendWhatsAppInteractiveButtons(phone,
    lang === "ur"
      ? `Aapka session chal raha hai${cartCount > 0 ? ` (${cartCount} items)` : ""}. Kya karein?`
      : `You have an active session${cartCount > 0 ? ` (${cartCount} items)` : ""}. What would you like to do?`,
    [
      { id: "session_continue", title: lang === "ur" ? "Continue" : "Continue" },
      { id: "session_start_new", title: lang === "ur" ? "Naya Start" : "Start Fresh" },
    ]
  );
}

// ─── handleMacroSelection ────────────────────────────────────────────────────

async function handleMacroSelection(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  if (input.startsWith("macro_deals")) {
    const page = parseInt(input.split("_page_")[1] ?? "1");
    const activeDeals = await db.query.deals.findMany({ where: eq(deals.isActive, true) });
    if (activeDeals.length === 0) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Abhi koi deal available nahi. Menu dekhein:"
        : "No active deals right now. Check our menu:");
      return handleGreeting(phone, session, false, false);
    }
    const rows = getPaginatedRows(activeDeals, page, "macro_deals", d => ({
      id: `deal_${d.id}`,
      title: d.name.substring(0, 24),
      description: `Rs. ${d.dealPrice}`,
    }));
    await sendWhatsAppInteractiveList(
      phone,
      lang === "ur" ? "*Aaj ki Deals:*\n\nKoi deal select karein:" : "*Today's Deals:*\n\nSelect a deal to see details:",
      lang === "ur" ? "Deals Dekhein" : "View Deals",
      [{ title: "Deals", rows }]
    );
    return updateSessionState(session.id, "deal_builder", cart, td);
  }

  if (input.startsWith("macro_menu")) {
    const page = parseInt(input.split("_page_")[1] ?? "1");
    const allCats = await db.select().from(categories).where(eq(categories.isActive, true));
    const foodCats = allCats.filter(c => {
      const n = c.name.toLowerCase();
      return !n.includes("drink") && !n.includes("beverage") && !n.includes("dessert") && !n.includes("ice cream");
    });
    const rows = getPaginatedRows(foodCats, page, "macro_menu", c => ({
      id: `cat_${c.id}`,
      title: c.name.substring(0, 24),
      description: lang === "ur" ? "Tap karein dekhne ke liye" : "Tap to view items",
    }));
    await sendWhatsAppInteractiveList(
      phone,
      lang === "ur" ? "*Menu Categories:*\n\nKoi category chunein:" : "*Menu Categories:*\n\nChoose a category:",
      lang === "ur" ? "Category Chunein" : "Choose Category",
      [{ title: lang === "ur" ? "Categories" : "Categories", rows }]
    );
    return updateSessionState(session.id, "category_selection", cart, td);
  }

  if (input === "macro_desserts") return handleItemSelection(phone, session, "show_desserts");
  if (input === "macro_drinks") return handleItemSelection(phone, session, "drinks");

  return handleGreeting(phone, session, false, false);
}

// ─── handleItemSelection ─────────────────────────────────────────────────────

async function handleItemSelection(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  // Checkout
  if (input === "checkout" || input === "done") {
    if (cart.length === 0) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Cart khali hai. *Menu* likh kar items add karein."
        : "Your cart is empty. Type *Menu* to add items.");
      return;
    }
    if (!td.dessertPitched) {
      const newTemp: TempData = { ...td, dessertPitched: true };
      await sendWhatsAppInteractiveButtons(phone,
        lang === "ur"
          ? "Kuch meetha bhi lein? Ice Cream ya Dessert?"
          : "Want to add something sweet? Ice cream or dessert?",
        [
          { id: "show_desserts", title: lang === "ur" ? "Haan, Dikhao" : "Yes, show me" },
          { id: "final_checkout", title: lang === "ur" ? "Nahi, Checkout" : "No, checkout" },
        ]
      );
      return updateSessionState(session.id, "item_selection", cart, newTemp);
    }
    return initiateCheckout(phone, session);
  }

  if (input === "final_checkout") return initiateCheckout(phone, session);

  // Desserts
  if (input === "show_desserts") {
    await sendWhatsAppImage(phone, `${BASE_URL}/Menu/IceCreams.jpeg`,
      lang === "ur" ? "Hamare Desserts" : "Our Desserts & Ice Creams");
    const dessertCat = await db.query.categories.findFirst({
      where: (cat, { or, ilike }) => or(ilike(cat.name, "%dessert%"), ilike(cat.name, "%ice cream%")),
    });
    if (dessertCat) return handleItemSelection(phone, { ...session, tempData: td } as AppSession, `cat_${dessertCat.id}`);
    return handleGreeting(phone, session, false, false);
  }

  // Category drill-down
  if (input.startsWith("cat_")) {
    const catId = input.split("_page_")[0].replace("cat_", "");
    const page = parseInt(input.split("_page_")[1] ?? "1");
    const cat = await db.query.categories.findFirst({ where: eq(categories.id, catId) });
    if (!cat) return handleGreeting(phone, session, false, false);
    const allItems = await db.select().from(menuItems).where(eq(menuItems.categoryId, cat.id));
    const active = allItems.filter(i => i.isAvailable);
    if (active.length === 0) {
      await sendWhatsAppText(phone, lang === "ur"
        ? `${cat.name} mein abhi koi item available nahi.`
        : `No items currently available in ${cat.name}.`);
      return handleGreeting(phone, session, false, false);
    }
    const rows = getPaginatedRows(active, page, `cat_${cat.id}`, i => ({
      id: `item_${i.id}`,
      title: i.name.substring(0, 24),
      description: `Rs. ${i.basePrice}`,
    }));
    await sendWhatsAppInteractiveList(
      phone,
      lang === "ur" ? `*${cat.name}*\n\nKoi item chunein:` : `*${cat.name}*\n\nSelect an item to see details:`,
      lang === "ur" ? "Item Chunein" : "Choose Item",
      [{ title: cat.name.substring(0, 24), rows }]
    );
    return updateSessionState(session.id, "item_selection", cart, td);
  }

  // Drinks
  if (input === "drinks") {
    const allCats = await db.select().from(categories).where(eq(categories.isActive, true));
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    const drinkCatIds = allCats
      .filter(c => ["drink", "beverage", "shake", "smoothie"].some(kw => c.name.toLowerCase().includes(kw)))
      .map(c => c.id);
    const drinks = allItems.filter(i => drinkCatIds.includes(i.categoryId)).slice(0, 10);
    if (drinks.length > 0) {
      const rows = drinks.map(i => ({ id: `item_${i.id}`, title: i.name.substring(0, 24), description: `Rs. ${i.basePrice}` }));
      await sendWhatsAppInteractiveList(
        phone,
        lang === "ur" ? "*Drinks:*\n\nKoi drink chunein:" : "*Drinks:*\n\nChoose a drink:",
        lang === "ur" ? "Drink Chunein" : "Choose Drink",
        [{ title: "Drinks", rows }]
      );
      return updateSessionState(session.id, "item_selection", cart, td);
    }
    await sendWhatsAppText(phone, lang === "ur" ? "Drinks abhi available nahi." : "Drinks are not available right now.");
    return handleGreeting(phone, session, false, false);
  }

  // Variant selection pending
  if (td.pendingItemId) {
    if (input.startsWith("var_")) {
      const variantId = input.replace("var_", "");
      return addItemToCartAndProceed(phone, session, td.pendingItemId, variantId);
    }
    await sendWhatsAppText(phone, lang === "ur"
      ? "Baraye meharbani upar diye options mein se ek chunein."
      : "Please choose a size from the options above.");
    return;
  }

  // "Order Now" button tapped on item card — check for variants before proceeding
  if (input.startsWith("view_item_")) {
    const itemId = input.replace("view_item_", "");
    const dbItemCheck = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (!dbItemCheck) return handleGreeting(phone, session, false, false);

    const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, itemId));
    if (variants.length > 0) {
      // Has variants — show size selection first
      const newTd: TempData = { ...td, pendingItemId: itemId };
      if (variants.length <= 3) {
        await sendWhatsAppInteractiveButtons(
          phone,
          `*${dbItemCheck.name}*\n\n${lang === "ur" ? "Size chunein:" : "Please choose a size:"}`,
          variants.slice(0, 3).map(v => ({ id: `var_${v.id}`, title: `${v.name} — Rs.${v.price}` }))
        );
      } else {
        await sendWhatsAppInteractiveList(
          phone,
          `*${dbItemCheck.name}*\n\n${lang === "ur" ? "Size chunein:" : "Please choose a size:"}`,
          lang === "ur" ? "Size Chunein" : "Choose Size",
          [{
            title: lang === "ur" ? "Sizes" : "Sizes",
            rows: variants.slice(0, 10).map(v => ({ id: `var_${v.id}`, title: v.name.substring(0, 24), description: `Rs. ${v.price}` }))
          }]
        );
      }
      return updateSessionState(session.id, "item_selection", cart, newTd);
    }
    // No variants — go straight to quantity
    return addItemToCartAndProceed(phone, session, itemId, null);
  }

  // Item selected from list → show product detail card with real image
  // The card has a button that sends view_item_{id} when tapped
  if (input.startsWith("item_")) {
    const itemId = input.replace("item_", "");
    const dbItem = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
    if (!dbItem) return handleGreeting(phone, session, false, false);

    const imageUrl = dbItem.imageUrl ?? `${BASE_URL}/Menu/Items.jpeg`;
    // Card body: name (bold) + description (italic) + price
    // "Order Now" button sends view_item_{id} — handled above with variant check
    await sendWhatsAppItemCard(
      phone,
      dbItem.name,
      dbItem.basePrice,
      imageUrl,
      dbItem.id,
      lang === "ur" ? "Order Karein" : "Order Now"
    );
    return updateSessionState(session.id, "item_selection", cart, td);
  }

  // Back to menu
  if (input === "menu" || input === "back" || input === "wapis") {
    return handleGreeting(phone, session, false, false);
  }

  // Fuzzy text search — user typed a food name
  if (input.length >= 3) {
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    const match = allItems.find(i => {
      const n = i.name.toLowerCase();
      return n.includes(input) || input.includes(n.replace(/\s+/g, ""));
    });
    if (match) {
      const imageUrl = match.imageUrl ?? `${BASE_URL}/Menu/Items.jpeg`;
      await sendWhatsAppItemCard(phone, match.name, match.basePrice, imageUrl, match.id,
        lang === "ur" ? "Order Karein" : "Order Now");
      return updateSessionState(session.id, "item_selection", cart, td);
    }

    // Off-topic detection
    const offTopic = detectOffTopic(input);
    if (offTopic === "thanks") {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Shukriya. Kuch aur chahiye toh *Menu* likhein."
        : "You're welcome! Type *Menu* whenever you're ready to order.");
      return;
    }
    if (offTopic === "complaint") {
      await db.update(whatsappSessions)
        .set({ state: "human_handoff", updatedAt: new Date() })
        .where(eq(whatsappSessions.id, session.id));
      await sendWhatsAppText(phone, lang === "ur"
        ? "Samajh gaya. Hamare team se connect kar rahe hain. Thodi dair mein jawab milega."
        : "Understood. Connecting you with our team. Someone will reply shortly.");
      return;
    }
  }

  // Nothing matched
  await sendWhatsAppText(phone, lang === "ur"
    ? "Samajh nahi aaya. Menu dekhne ke liye *Menu* likhein ya item ka naam type karein."
    : "I did not catch that. Type *Menu* to browse, or type the name of what you want.");
}

// ─── addItemToCartAndProceed ──────────────────────────────────────────────────

async function addItemToCartAndProceed(
  phone: string,
  session: AppSession,
  itemId: string,
  variantId: string | null
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  const item = await db.query.menuItems.findFirst({ where: eq(menuItems.id, itemId) });
  if (!item) return handleGreeting(phone, session, false, false);

  let price = item.basePrice;
  let displayName = item.name;

  if (variantId) {
    const variant = await db.query.itemVariants.findFirst({ where: eq(itemVariants.id, variantId) });
    if (variant) {
      price = variant.price;
      displayName = `${item.name} (${variant.name})`;
    }
  }

  const desc = item.description ? `\n_${item.description.substring(0, 70)}_` : "";
  const priceLabel = lang === "ur" ? `Qeemat: Rs. ${price}` : `Price: Rs. ${price}`;

  const newTd: TempData = {
    ...td,
    pendingCartItem: { menuItemId: itemId, variantId, name: displayName, price, categoryId: item.categoryId },
  };
  if (newTd.pendingItemId !== undefined) delete newTd.pendingItemId;

  await sendWhatsAppInteractiveButtons(
    phone,
    `*${displayName}*${desc}\n\n${priceLabel}\n\n${lang === "ur" ? "Kitne lenge?" : "How many would you like?"}`,
    [
      { id: "qty_1", title: "1" },
      { id: "qty_2", title: "2" },
      { id: "qty_3", title: "3" },
    ]
  );
  return updateSessionState(session.id, "cart_review", cart, newTd);
}

// ─── handleQuantityInput ─────────────────────────────────────────────────────

async function handleQuantityInput(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  let qty = 1;
  if (input.startsWith("qty_")) {
    qty = parseInt(input.replace("qty_", ""));
  } else {
    const parsed = parseInt(input);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      qty = parsed;
    } else {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Sahi number likhein jaise 1, 2 ya 3."
        : "Please type a valid number like 1, 2, or 3.");
      return;
    }
  }

  const pending = td.pendingCartItem;
  if (!pending) return handleGreeting(phone, session, false, false);

  const newCart: CartItem[] = [
    ...cart,
    { menuItemId: pending.menuItemId, variantId: pending.variantId, quantity: qty, name: pending.name, price: pending.price },
  ];
  const newTd: TempData = { ...td };
  delete newTd.pendingCartItem;

  const addedMsg = `${qty}x *${pending.name}* ${lang === "ur" ? "cart mein add ho gaya." : "added to cart."}`;

  // Check if food category → cross-sell drinks
  const catRow = await db.query.categories.findFirst({ where: eq(categories.id, pending.categoryId) });
  const isFoodCat = catRow && !["drink", "beverage", "dessert", "ice cream"].some(kw => catRow.name.toLowerCase().includes(kw));

  if (isFoodCat) {
    await sendWhatsAppInteractiveButtons(phone,
      `${addedMsg}\n\n${lang === "ur" ? "Iske saath koi thanda peena chahenge?" : "Would you like a cold drink with that?"}`,
      [
        { id: "drinks", title: lang === "ur" ? "Haan, Drinks" : "Yes, Drinks" },
        { id: "checkout", title: lang === "ur" ? "Order Karein" : "Checkout" },
        { id: "macro_menu", title: lang === "ur" ? "Aur Items" : "Add More" },
      ]
    );
  } else {
    await sendWhatsAppInteractiveButtons(phone,
      `${addedMsg}\n\n${lang === "ur" ? "Kuch aur chahiye?" : "Anything else?"}`,
      [
        { id: "checkout", title: lang === "ur" ? "Order Karein" : "Checkout" },
        { id: "macro_menu", title: lang === "ur" ? "Aur Items" : "Add More" },
      ]
    );
  }
  return updateSessionState(session.id, "item_selection", newCart, newTd);
}

// ─── initiateCheckout ─────────────────────────────────────────────────────────

async function initiateCheckout(phone: string, session: AppSession): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  // Prefill check — previous delivery order
  const lastOrder = await db.query.orders.findFirst({
    where: eq(orders.customerPhone, phone),
    orderBy: [desc(orders.createdAt)],
  });

  if (lastOrder?.customerName && lastOrder?.deliveryAddress) {
    const newTd: TempData = { ...td, previousOrder: lastOrder as unknown as Record<string, unknown> };
    await sendWhatsAppInteractiveButtons(phone,
      lang === "ur"
        ? `Aapki pichli details:\nNaam: *${lastOrder.customerName}*\nAddress: *${lastOrder.deliveryAddress}*\n\nInhein use karein?`
        : `Your previous details:\nName: *${lastOrder.customerName}*\nAddress: *${lastOrder.deliveryAddress}*\n\nUse these?`,
      [
        { id: "use_prev", title: lang === "ur" ? "Haan, Yahi" : "Yes, use these" },
        { id: "use_new", title: lang === "ur" ? "Nayi Details" : "Enter new" },
      ]
    );
    return updateSessionState(session.id, "previous_details_prompt", cart, newTd);
  }

  // New customer — ask address
  await sendWhatsAppText(phone, lang === "ur"
    ? "Apna delivery address likhein ya location pin share karein."
    : "Please type your delivery address, or share your location pin by tapping the attachment icon.");
  return updateSessionState(session.id, "address_input", cart, td);
}

// ─── handleAddressInput ───────────────────────────────────────────────────────

async function handleAddressInput(
  phone: string,
  session: AppSession,
  input: string,
  message: Record<string, unknown>
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  let finalAddress = input;
  let lat: number | null = null;
  let long: number | null = null;

  if (message.type === "location" && message.location) {
    const loc = message.location as { latitude: number; longitude: number; name?: string; address?: string };
    lat = loc.latitude;
    long = loc.longitude;
    finalAddress = [loc.name, loc.address].filter(Boolean).join(", ") || "Pinned Location";
  } else {
    // Validate — must contain letters and be long enough
    if (!/[a-zA-Z\u0600-\u06FF]/.test(input) || input.length < 5) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Sahi address likhein jis mein gali ya mohalla ka naam ho."
        : "Please type a valid address with a street or area name.");
      return;
    }
  }

  await sendWhatsAppText(phone, lang === "ur"
    ? "Theek hai. Apna contact number batayein jis par rider call kar sake."
    : "Got it. Please share your contact number so the rider can call you.");
  return updateSessionState(session.id, "alt_phone_input", cart, { ...td, address: finalAddress, lat, long });
}

// ─── handleAltPhoneInput ──────────────────────────────────────────────────────

async function handleAltPhoneInput(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  if (input.replace(/\D/g, "").length < 7) {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Sahi phone number likhein jaise 03001234567."
      : "Please enter a valid phone number like 03001234567.");
    return;
  }
  await sendWhatsAppText(phone, lang === "ur"
    ? "Apna poora naam batayein."
    : "What is your full name?");
  return updateSessionState(session.id, "name_input", cart, { ...td, altPhone: input });
}

// ─── handleNameInput ──────────────────────────────────────────────────────────

async function handleNameInput(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  if (!/[a-zA-Z\u0600-\u06FF]/.test(input) || input.length < 2) {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Sahi naam likhein."
      : "Please enter a valid name.");
    return;
  }
  await sendWhatsAppText(phone, lang === "ur"
    ? "Kitchen ke liye koi khaas hidayat? (Agar nahi toh *none* likhein)"
    : "Any special instructions for the kitchen? (Type *none* if not)");
  return updateSessionState(session.id, "checkout", cart, { ...td, name: input });
}

// ─── handleInstructionsInput ──────────────────────────────────────────────────

async function handleInstructionsInput(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  // Preserve existing checkoutSessionId — never regenerate mid-flow
  const checkoutSessionId =
    td.checkoutSessionId ?? `chk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const newTd: TempData = { ...td, instructions: input, checkoutSessionId };

  // Build order summary
  const itemIds = cart.map(c => c.menuItemId).filter((id): id is string => id !== null);
  const dbItems = itemIds.length > 0
    ? await db.select().from(menuItems).where(inArray(menuItems.id, itemIds))
    : [];

  let subtotal = 0;
  const dealGroups: Record<string, { lines: string[]; total: number }> = {};
  const regularLines: string[] = [];

  for (const c of cart) {
    const dbItem = dbItems.find(i => i.id === c.menuItemId);
    const name = c.name ?? dbItem?.name ?? "Item";
    const price = c.price ?? dbItem?.basePrice ?? 0;
    const lineTotal = price * c.quantity;
    subtotal += lineTotal;

    if (c.isDeal && name.includes("[DEAL:")) {
      const m = name.match(/\[DEAL: (.*?)\] (.*)/);
      if (m) {
        const dName = m[1];
        if (!dealGroups[dName]) dealGroups[dName] = { lines: [], total: 0 };
        dealGroups[dName].lines.push(`  - ${c.quantity}x ${m[2]}`);
        dealGroups[dName].total += lineTotal;
      } else {
        regularLines.push(`${c.quantity}x *${name}* — Rs. ${lineTotal}`);
      }
    } else {
      regularLines.push(`${c.quantity}x *${name.replace(/^\[DEAL: .*?\]\s*/, "")}* — Rs. ${lineTotal}`);
    }
  }

  const dealLines: string[] = [];
  for (const [dName, g] of Object.entries(dealGroups)) {
    dealLines.push(`*${dName}* — Rs. ${g.total}`);
    dealLines.push(...g.lines);
  }

  const deliveryFee = STORE_CONSTANTS.WHATSAPP_DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;

  const addressDisplay = newTd.address ?? (lang === "ur" ? "Address diya gaya" : "Address provided");
  const instrLine = input.toLowerCase() !== "none"
    ? (lang === "ur" ? `Hidayat: ${input}` : `Instructions: ${input}`)
    : "";

  const summaryLines = [
    lang === "ur" ? "*Order Summary*" : "*Order Summary*",
    "",
    lang === "ur" ? `Naam: *${newTd.name}*` : `Name: *${newTd.name}*`,
    lang === "ur" ? `Address: ${addressDisplay}` : `Address: ${addressDisplay}`,
    newTd.altPhone ? (lang === "ur" ? `Contact: ${newTd.altPhone}` : `Contact: ${newTd.altPhone}`) : "",
    instrLine,
    "",
    lang === "ur" ? "*Items:*" : "*Items:*",
    ...dealLines,
    ...regularLines,
    "",
    `${lang === "ur" ? "Delivery" : "Delivery"}: Rs. ${deliveryFee}`,
    `*${lang === "ur" ? "Total" : "Total"}: Rs. ${totalAmount}*`,
    lang === "ur" ? "_Payment: Cash on Delivery_" : "_Payment: Cash on Delivery_",
    "",
    lang === "ur" ? "Sab theek hai?" : "Is everything correct?",
  ].filter(s => s !== "").join("\n");

  await sendWhatsAppInteractiveButtons(phone, summaryLines, [
    { id: "confirm_yes", title: lang === "ur" ? "Haan, Confirm" : "Yes, Confirm" },
    { id: "edit_cart", title: lang === "ur" ? "Cart Edit Karein" : "Edit Cart" },
    { id: "confirm_no", title: lang === "ur" ? "Cancel" : "Cancel" },
  ]);

  return updateSessionState(session.id, "order_confirmation", cart, newTd);
}

// ─── handleConfirmation ───────────────────────────────────────────────────────

async function handleConfirmation(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  // Fuzzy yes/no
  const yesSet = new Set(["yes", "haan", "han", "ha", "g", "ji", "jee", "ok", "okay", "confirm", "yep", "hnji", "theek", "zaroor"]);
  const noSet = new Set(["no", "nahi", "nai", "na", "nope", "cancel", "band", "mat"]);

  let normalised = input;
  if (input === "confirm_yes" || yesSet.has(input)) normalised = "confirm_yes";
  else if (input === "confirm_no" || noSet.has(input)) normalised = "confirm_no";

  if (normalised === "confirm_yes") {
    try {
      const result = await createOrderFromWhatsApp(phone, "default");

      if ((result as { isDuplicate?: boolean }).isDuplicate) {
        await sendWhatsAppText(phone, lang === "ur"
          ? `Order *#${result.orderId}* pehle se confirm ho chuka hai.`
          : `Order *#${result.orderId}* has already been placed.`);
        await updateSessionState(session.id, "order_created", [], td);
        return;
      }

      // Ask about alert subscription
      await sendWhatsAppInteractiveButtons(phone,
        lang === "ur"
          ? `Order *#${result.orderId}* confirm ho gaya.\nTotal: Rs. ${result.totalAmount}\n\nKya aap chahte hain ke order status ke updates yahan WhatsApp pe milein?`
          : `Order *#${result.orderId}* confirmed.\nTotal: Rs. ${result.totalAmount}\n\nWould you like to receive order updates on WhatsApp?`,
        [
          { id: "alert_yes", title: lang === "ur" ? "Haan, Batao" : "Yes please" },
          { id: "alert_no", title: lang === "ur" ? "Nahi Shukriya" : "No thanks" },
        ]
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "";
      console.error("[handleConfirmation] Order creation failed:", errMsg);

      let userMsg = lang === "ur"
        ? "Maafi chahta hoon, order process nahi ho saka. Dobara try karein."
        : "Sorry, your order could not be processed. Please try again.";

      if (errMsg.includes("is currently unavailable")) {
        const item = errMsg.replace("Sorry, ", "").replace(" is currently unavailable.", "");
        userMsg = lang === "ur"
          ? `Maafi chahta hoon, *${item}* abhi available nahi. Cart update karein.`
          : `Sorry, *${item}* is currently unavailable. Please update your cart.`;
      } else if (errMsg.toLowerCase().includes("closed")) {
        userMsg = lang === "ur"
          ? "Restaurant abhi band hai. Thodi dair baad try karein."
          : "The restaurant is currently closed. Please try again later.";
      } else if (errMsg.includes("Missing checkout session")) {
        userMsg = lang === "ur"
          ? "Kuch masla ho gaya. *Menu* likh kar dobara order start karein."
          : "Something went wrong. Please type *Menu* to start a new order.";
        await updateSessionState(session.id, "greeting", [], {});
        await sendWhatsAppText(phone, userMsg);
        return;
      }

      await sendWhatsAppText(phone, userMsg);
      // Keep them on the confirmation screen so they can retry
      return updateSessionState(session.id, "order_confirmation", cart, td);
    }
    return;
  }

  if (normalised === "confirm_no") {
    await sendWhatsAppText(phone, lang === "ur"
      ? "Order cancel ho gaya. Naya order karne ke liye *Menu* likhein."
      : "Order cancelled. Type *Menu* to start a new order.");
    return updateSessionState(session.id, "cancelled", [], {});
  }

  if (input === "edit_cart") {
    if (cart.length === 0) {
      await sendWhatsAppText(phone, lang === "ur" ? "Cart khali hai." : "Your cart is empty.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    const rows = cart.slice(0, 9).map((c, i) => {
      const name = (c.name ?? "Item").replace(/^\[DEAL: .*?\]\s*/, "").substring(0, 18);
      return {
        id: `rm_${i}`,
        title: `Remove: ${name}`,
        description: `${c.quantity}x — Rs. ${(c.price ?? 0) * c.quantity}`,
      };
    });
    await sendWhatsAppInteractiveList(phone,
      lang === "ur" ? "Kaunsa item remove karein?" : "Which item would you like to remove?",
      lang === "ur" ? "Item Chunein" : "Select Item",
      [{ title: lang === "ur" ? "Cart Items" : "Cart Items", rows }]
    );
    return updateSessionState(session.id, "cart_edit", cart, td);
  }

  // Unrecognised input — re-send confirmation, preserve checkoutSessionId
  await sendWhatsAppInteractiveButtons(phone,
    lang === "ur" ? "Baraye meharbani confirm karein:" : "Please confirm your order:",
    [
      { id: "confirm_yes", title: lang === "ur" ? "Haan, Confirm" : "Yes, Confirm" },
      { id: "edit_cart", title: lang === "ur" ? "Cart Edit" : "Edit Cart" },
      { id: "confirm_no", title: lang === "ur" ? "Cancel" : "Cancel" },
    ]
  );
  return updateSessionState(session.id, "order_confirmation", cart, td);
}

// ─── handleCartEdit ───────────────────────────────────────────────────────────

async function handleCartEdit(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  let cart = (session.cart ?? []) as CartItem[];

  if (input.startsWith("rm_")) {
    const idx = parseInt(input.replace("rm_", ""));
    if (idx >= 0 && idx < cart.length) {
      const removed = cart[idx];
      cart = cart.filter((_, i) => i !== idx);
      await sendWhatsAppText(phone, lang === "ur"
        ? `*${(removed.name ?? "Item").replace(/^\[DEAL: .*?\]\s*/, "")}* cart se remove ho gaya.`
        : `*${(removed.name ?? "Item").replace(/^\[DEAL: .*?\]\s*/, "")}* removed from cart.`);
    }
    if (cart.length === 0) {
      await sendWhatsAppText(phone, lang === "ur"
        ? "Cart khali hai. *Menu* likh kar items add karein."
        : "Cart is empty. Type *Menu* to add items.");
      return updateSessionState(session.id, "greeting", [], {});
    }
    return handleInstructionsInput(phone, { ...session, cart } as AppSession, td.instructions ?? "none");
  }

  // Any other input — return to summary
  return handleInstructionsInput(phone, { ...session, cart } as AppSession, td.instructions ?? "none");
}

// ─── handleDealBuilder ────────────────────────────────────────────────────────

async function handleDealBuilder(
  phone: string,
  session: AppSession,
  input: string
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];

  // Cancel deal builder
  if (["menu", "cancel", "back", "wapis", "mein menu", "cancel deal"].includes(input)) {
    await sendWhatsAppText(phone, lang === "ur" ? "Deal cancel ho gaya." : "Deal builder cancelled.");
    return handleGreeting(phone, { ...session, tempData: { ...td, deal_builder: undefined } } as AppSession, false, false);
  }

  if (input.startsWith("macro_deals_page_")) return handleMacroSelection(phone, session, input);

  if (input.startsWith("deal_")) {
    const dealId = input.replace("deal_", "");
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: { slots: { orderBy: (s, { asc }) => [asc(s.createdAt)] } },
    });
    if (!deal) {
      await sendWhatsAppText(phone, lang === "ur" ? "Deal nahi mili." : "Deal not found.");
      return handleMacroSelection(phone, session, "macro_deals");
    }
    if (deal.description) {
      await sendWhatsAppText(phone, `*${deal.name}*\n_${deal.description}_\n\n*Rs. ${deal.dealPrice}*`);
    }
    const newTd: TempData = {
      ...td,
      deal_builder: { dealId: deal.id, dealName: deal.name, dealPrice: deal.dealPrice, slots: deal.slots, currentIndex: 0, selections: [] },
    };
    return processDealSlot(phone, { ...session, tempData: newTd } as AppSession);
  }

  if (input.startsWith("dbuild_item_")) {
    const itemId = input.replace("dbuild_item_", "");
    const builder = td.deal_builder;
    if (!builder) return handleGreeting(phone, session, false, false);
    const currentSlot = (builder.slots as DBSlot[])[builder.currentIndex];
    const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, itemId));
    let selectedVariantId: string | null = null;
    if (variants.length > 0) {
      if (currentSlot.requiredVariantName) {
        const req = variants.find(v => v.name.toLowerCase() === currentSlot.requiredVariantName!.toLowerCase());
        selectedVariantId = req?.id ?? variants[0].id;
      } else {
        selectedVariantId = variants[0].id;
      }
    }
    builder.selections.push({ slotName: currentSlot.slotName, menuItemId: itemId, variantId: selectedVariantId, quantity: currentSlot.quantity });
    builder.currentIndex++;
    return processDealSlot(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession);
  }

  if (input.startsWith("dbuild_cat_")) {
    const parts = input.split("_page_");
    const catId = parts[0].replace("dbuild_cat_", "");
    const page = parseInt(parts[1] ?? "1");
    return sendSlotCategoryOptions(phone, session, catId, page);
  }

  // Unrecognised input while in deal builder — re-show current slot prompt
  const builderFallback = td.deal_builder;
  if (builderFallback) {
    return processDealSlot(phone, session);
  }
  return handleGreeting(phone, session, false, false);
}

// ─── processDealSlot ──────────────────────────────────────────────────────────

async function processDealSlot(phone: string, session: AppSession): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const cart = (session.cart ?? []) as CartItem[];
  const builder = td.deal_builder;
  if (!builder) return handleGreeting(phone, session, false, false);

  // All slots filled — add deal to cart
  if (builder.currentIndex >= builder.slots.length) {
    const totalQty = builder.selections.reduce((s, sel) => s + sel.quantity, 0);
    const pricePerQty = totalQty > 0 ? Math.floor(builder.dealPrice / totalQty) : builder.dealPrice;
    const newCart: CartItem[] = [...cart];
    for (const sel of builder.selections) {
      newCart.push({
        menuItemId: sel.menuItemId,
        variantId: sel.variantId,
        quantity: sel.quantity,
        name: `[DEAL: ${builder.dealName}] ${sel.slotName}`,
        price: pricePerQty,
        specialInstructions: `[DEAL: ${builder.dealName}]`,
        isDeal: true,
      });
    }
    const newTd: TempData = { ...td };
    delete newTd.deal_builder;

    await sendWhatsAppInteractiveButtons(phone,
      lang === "ur"
        ? `*${builder.dealName}* cart mein add ho gaya.\n\nKuch aur chahiye?`
        : `*${builder.dealName}* added to your cart.\n\nAnything else?`,
      [
        { id: "checkout", title: lang === "ur" ? "Order Karein" : "Checkout" },
        { id: "macro_menu", title: lang === "ur" ? "Aur Items" : "Add More" },
      ]
    );
    return updateSessionState(session.id, "item_selection", newCart, newTd);
  }

  const slot = (builder.slots as DBSlot[])[builder.currentIndex];

  // Fixed item slot — auto-select
  if (slot.menuItemId && !slot.categoryId && slot.menuItem) {
    const mi = slot.menuItem;
    let variantId: string | null = null;
    if (slot.requiredVariantName && mi.variants) {
      const req = mi.variants.find(v => v.name.toLowerCase() === slot.requiredVariantName!.toLowerCase());
      variantId = req?.id ?? null;
    }
    builder.selections.push({ slotName: slot.slotName, menuItemId: mi.id, variantId, quantity: slot.quantity });
    builder.currentIndex++;
    return processDealSlot(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession);
  }

  // Dynamic choice slot
  if (slot.categoryId) {
    await updateSessionState(session.id, "deal_builder", cart, { ...td, deal_builder: builder });
    return sendSlotCategoryOptions(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession, slot.categoryId, 1);
  }

  // Slot has neither a fixed item nor a category — skip it automatically
  builder.currentIndex++;
  return processDealSlot(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession);
}

// ─── sendSlotCategoryOptions ──────────────────────────────────────────────────

async function sendSlotCategoryOptions(
  phone: string,
  session: AppSession,
  catId: string,
  page: number
): Promise<void> {
  const lang = session.language ?? "en";
  const td = (session.tempData ?? {}) as TempData;
  const builder = td.deal_builder;
  if (!builder) return handleGreeting(phone, session, false, false);

  const slot = (builder.slots as DBSlot[])[builder.currentIndex];
  const allItems = await db.select().from(menuItems).where(eq(menuItems.categoryId, catId));
  let valid = allItems.filter(i => i.isAvailable);

  if (slot.requiredVariantName) {
    const allVariants = await db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, valid.map(i => i.id)));
    const hasRequired = new Set(
      allVariants
        .filter(v => v.name.toLowerCase() === slot.requiredVariantName!.toLowerCase())
        .map(v => v.menuItemId)
    );
    valid = valid.filter(i => hasRequired.has(i.id));
  }

  if (valid.length === 0) {
    // Skip this slot
    builder.currentIndex++;
    return processDealSlot(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession);
  }

  // Auto-select if only one option
  if (valid.length === 1 && page === 1) {
    let variantId: string | null = null;
    if (slot.requiredVariantName) {
      const variants = await db.select().from(itemVariants).where(eq(itemVariants.menuItemId, valid[0].id));
      const req = variants.find(v => v.name.toLowerCase() === slot.requiredVariantName!.toLowerCase());
      variantId = req?.id ?? null;
    }
    builder.selections.push({ slotName: slot.slotName, menuItemId: valid[0].id, variantId, quantity: slot.quantity });
    builder.currentIndex++;
    return processDealSlot(phone, { ...session, tempData: { ...td, deal_builder: builder } } as AppSession);
  }

  const total = builder.slots.length;
  const current = builder.currentIndex + 1;

  const rows = getPaginatedRows(valid, page, `dbuild_cat_${catId}`, i => ({
    id: `dbuild_item_${i.id}`,
    title: i.name.substring(0, 24),
    description: lang === "ur" ? `${slot.slotName} ke liye` : `For ${slot.slotName}`,
  }));

  await sendWhatsAppInteractiveList(
    phone,
    lang === "ur"
      ? `*Step ${current} of ${total}:* ${slot.slotName} ke liye item chunein:`
      : `*Step ${current} of ${total}:* Choose an item for *${slot.slotName}*:`,
    lang === "ur" ? "Chunein" : "Choose",
    [{ title: slot.slotName.substring(0, 24), rows }]
  );
}
