// database/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "kitchen",
  "waiter",
  "rider",
  "customer",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "approved",
  "preparing",
  "ready_for_pickup",
  "delayed",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
]);

export const orderTypeEnum = pgEnum("order_type", ["delivery", "pickup", "dine_in"]);

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "pending",
  "preparing",
  "served"
]);

export const orderSourceEnum = pgEnum("order_source", [
  "website",
  "whatsapp",
  "qr",
  "admin",
  "system"
]);

export const outboundMessageStatusEnum = pgEnum("outbound_message_status", [
  "pending",
  "sending",
  "sent",
  "failed",
  "retry"
]);

export const whatsappSessionStateEnum = pgEnum("whatsapp_session_state", [
  "language_selection",
  "macro_selection",
  "deal_builder",
  "active_order_menu",
  "reorder_menu",
  "greeting",
  "category_selection",
  "item_selection",
  "cart_review",
  "checkout",
  "previous_details_prompt",
  "name_input",
  "address_input",
  "alt_phone_input",
  "order_confirmation",
  "order_created",
  "cart_edit",
  "human_handoff",
  "cancelled",
  "expired",
]);

export const whatsappMessageDirectionEnum = pgEnum("whatsapp_message_direction", [
  "inbound",
  "outbound",
]);

export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
  "processed",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "COD",
  "Cash",
  "Card",
  "JazzCash",
  "EasyPaisa",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "refunded",
  "collected_by_rider",
]);

export const riderStatusEnum = pgEnum("rider_status", [
  "available",
  "busy",
  "offline",
]);

export const dealTypeEnum = pgEnum("deal_type", ["combo", "event"]);

export const discountTypeEnum = pgEnum("discount_type", ["flat", "percent"]);

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id:             uuid("id").defaultRandom().primaryKey(),
    name:           varchar("name", { length: 120 }).notNull(),
    phone:          varchar("phone", { length: 20 }).notNull().unique(),
    email:          varchar("email", { length: 255 }).unique(),
    passwordHash:   text("password_hash"),
    role:           userRoleEnum("role").default("customer").notNull(),
    age:            integer("age"),
    isActive:       boolean("is_active").default(true),
    // Instant-revocation: increment this on deactivate/permission change
    sessionVersion: integer("session_version").default(1).notNull(),
    createdAt:      timestamp("created_at").defaultNow(),
    updatedAt:      timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    phoneIdx:   index("users_phone_idx").on(table.phone),
    roleIdx:    index("users_role_idx").on(table.role),
    activeIdx:  index("users_is_active_idx").on(table.isActive),
  })
);

// Granular permission flags per manager (admin has all, kitchen/waiter/rider have none)
export const staffPermissions = pgTable("staff_permissions", {
  id:                    uuid("id").defaultRandom().primaryKey(),
  userId:                uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  permissions:           jsonb("permissions").$type<any>().notNull().default({}),
  maxDiscountPercentage: integer("max_discount_percentage").default(0).notNull(),
  updatedAt:             timestamp("updated_at").defaultNow(),
});

// Audit log — every destructive or elevated action is written here
export const activityLog = pgTable(
  "activity_log",
  {
    id:         uuid("id").defaultRandom().primaryKey(),
    userId:     uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action:     varchar("action", { length: 100 }).notNull(), // e.g. "order.approved"
    targetType: varchar("target_type", { length: 50 }),       // "order", "menu_item"
    targetId:   varchar("target_id", { length: 100 }),
    metadata:   jsonb("metadata"),
    createdAt:  timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx:       index("activity_log_user_id_idx").on(table.userId),
    createdTypeIdx:  index("activity_log_created_type_idx").on(table.createdAt, table.targetType),
  })
);

export const riderProfiles = pgTable("rider_profiles", {
  id:             uuid("id").defaultRandom().primaryKey(),
  userId:         uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  vehicleType:    varchar("vehicle_type", { length: 50 }).default("bike"),
  vehiclePlate:   varchar("vehicle_plate", { length: 50 }),
  status:         riderStatusEnum("status").default("offline"),
  currentOrderId: varchar("current_order_id", { length: 12 }),
});

export const categories = pgTable("categories", {
  id:            uuid("id").defaultRandom().primaryKey(),
  name:          varchar("name", { length: 100 }).notNull(),
  slug:          varchar("slug", { length: 100 }).notNull().unique(),
  description:   text("description"),
  sortOrder:     integer("sort_order").default(0),
  isActive:      boolean("is_active").default(true),
  isGlobalAddon: boolean("is_global_addon").default(false),
  createdAt:     timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id:              uuid("id").defaultRandom().primaryKey(),
    categoryId:      uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    name:            varchar("name", { length: 150 }).notNull(),
    slug:            varchar("slug", { length: 150 }).notNull().unique(),
    description:     text("description"),
    basePrice:       integer("base_price").notNull(),
    imageUrl:        varchar("image_url", { length: 500 }),
    isAvailable:     boolean("is_available").default(true),
    isFeatured:      boolean("is_featured").default(false),
    tags:            jsonb("tags").$type<{
      isSpicy?:   boolean;
      isVeg?:     boolean;
      isNew?:     boolean;
      isPopular?: boolean;
    }>(),
    preparationTime: integer("preparation_time"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    categoryIdx:  index("menu_items_category_id_idx").on(table.categoryId),
    availableIdx: index("menu_items_is_available_idx").on(table.isAvailable),
  })
);

export const itemVariants = pgTable("item_variants", {
  id:          uuid("id").defaultRandom().primaryKey(),
  menuItemId:  uuid("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" })
    .notNull(),
  name:        varchar("name", { length: 50 }).notNull(),
  price:       integer("price").notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const itemAddOns = pgTable("item_add_ons", {
  id:          uuid("id").defaultRandom().primaryKey(),
  menuItemId:  uuid("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" })
    .notNull(),
  name:        varchar("name", { length: 100 }).notNull(),
  price:       integer("price").notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const inventoryItems = pgTable("inventory_items", {
  id:                uuid("id").defaultRandom().primaryKey(),
  itemName:          varchar("item_name", { length: 255 }).notNull(),
  sku:               varchar("sku", { length: 100 }).unique(),
  stockQuantity:     integer("stock_quantity").notNull().default(0),
  unit:              varchar("unit", { length: 50 }).notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  costPerUnit:       integer("cost_per_unit").default(0).notNull(), // in cents/pennies
  supplierName:      varchar("supplier_name", { length: 150 }),
  lastRestockedAt:   timestamp("last_restocked_at"),
});

export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", [
  "restock",
  "consumption",
  "adjustment",
  "waste"
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
  id:              uuid("id").defaultRandom().primaryKey(),
  inventoryItemId: uuid("inventory_item_id")
    .references(() => inventoryItems.id, { onDelete: "cascade" })
    .notNull(),
  type:            inventoryTransactionTypeEnum("type").notNull(),
  quantityDelta:   integer("quantity_delta").notNull(),
  unitCost:        integer("unit_cost").default(0).notNull(),
  referenceId:     varchar("reference_id", { length: 255 }), // OCR Invoice # or Order ID
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Deals — fixed combos and event-based discounts
// -----------------------------------------------------------------------------
export const deals = pgTable(
  "deals",
  {
    id:            uuid("id").defaultRandom().primaryKey(),
    name:          varchar("name", { length: 150 }).notNull(),
    description:   text("description"),
    imageUrl:      varchar("image_url", { length: 500 }),
    dealType:      dealTypeEnum("deal_type").default("combo").notNull(),
    eventLabel:    varchar("event_label", { length: 100 }),
    originalPrice: integer("original_price").notNull(),
    dealPrice:     integer("deal_price").notNull(),
    validFrom:  timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    isActive:   boolean("is_active").default(true).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt:  timestamp("created_at").defaultNow(),
    updatedAt:  timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    activeIdx:     index("deals_is_active_idx").on(table.isActive),
    validUntilIdx: index("deals_valid_until_idx").on(table.validUntil),
    archivedIdx:   index("deals_is_archived_idx").on(table.isArchived),
  })
);

export const dealSlots = pgTable(
  "deal_slots",
  {
    id:            uuid("id").defaultRandom().primaryKey(),
    dealId:        uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
    slotName:      varchar("slot_name", { length: 150 }).notNull(), // e.g., "1x Medium Pizza"
    quantity:      integer("quantity").default(1).notNull(),
    
    // Optional: Fixed Menu Item for this slot (e.g., specific "Zinger Burger")
    menuItemId:    uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    
    // Optional: Category for dynamic choice (e.g., Any "Pizza")
    categoryId:    uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    
    // Optional: Required Variant Name (e.g., "Medium" for pizzas, or "1.5 Ltr" for drinks)
    requiredVariantName: varchar("required_variant_name", { length: 100 }),
    
    createdAt:     timestamp("created_at").defaultNow(),
  },
  (table) => ({
    dealIdx:       index("deal_slots_deal_id_idx").on(table.dealId),
  })
);

// -----------------------------------------------------------------------------
// Coupons
// -----------------------------------------------------------------------------
export const coupons = pgTable(
  "coupons",
  {
    id:                uuid("id").defaultRandom().primaryKey(),
    code:              varchar("code", { length: 50 }).notNull().unique(),
    description:       varchar("description", { length: 255 }),
    discountType:      discountTypeEnum("discount_type").notNull(),
    discountValue:     integer("discount_value").notNull(),
    applicableItemIds: jsonb("applicable_item_ids").$type<string[]>(),
    minOrderAmount:    integer("min_order_amount").default(0),
    maxUses:           integer("max_uses"),
    usedCount:         integer("used_count").default(0).notNull(),
    validFrom:         timestamp("valid_from"),
    validUntil:        timestamp("valid_until"),
    isActive:          boolean("is_active").default(true).notNull(),
    createdAt:         timestamp("created_at").defaultNow(),
  },
  (table) => ({
    codeIdx:   index("coupons_code_idx").on(table.code),
    activeIdx: index("coupons_is_active_idx").on(table.isActive),
  })
);

// -----------------------------------------------------------------------------
// Restaurant Tables
// -----------------------------------------------------------------------------
export const restaurantTables = pgTable("restaurant_tables", {
  id:       uuid("id").defaultRandom().primaryKey(),
  name:     varchar("name", { length: 50 }).notNull(),
  capacity: integer("capacity").default(4).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id:                varchar("id", { length: 12 }).primaryKey(),
    customerId:        uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    riderId:           uuid("rider_id").references(() => users.id, { onDelete: "set null" }),
    // FK to the waiter/staff user who took the order (replaces plain waiterName string)
    waiterId:          uuid("waiter_id").references(() => users.id, { onDelete: "set null" }),
    createdById:       uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    customerName:      varchar("customer_name", { length: 120 }).notNull(),
    customerPhone:     varchar("customer_phone", { length: 20 }).notNull(),
    orderType:         orderTypeEnum("order_type").default("delivery").notNull(),
    tableId:           uuid("table_id").references(() => restaurantTables.id, { onDelete: "set null" }),
    tableNumber:       varchar("table_number", { length: 20 }),
    // Legacy plain string kept for backward compat / display when waiterId is null
    waiterName:        varchar("waiter_name", { length: 120 }),
    deliveryAddress:   text("delivery_address"),
    deliveryNotes:     text("delivery_notes"),
    latitude:          real("latitude"),
    longitude:         real("longitude"),
    status:            orderStatusEnum("status").default("pending").notNull(),
    source:            orderSourceEnum("source").default("website").notNull(),
    delayReason:       text("delay_reason"),
    rejectionReason:   text("rejection_reason"),
    paymentMethod:     paymentMethodEnum("payment_method").default("COD").notNull(),
    paymentStatus:     paymentStatusEnum("payment_status").default("unpaid").notNull(),
    subtotal:          integer("subtotal").notNull(),
    deliveryFee:       integer("delivery_fee").default(0).notNull(),
    discountAmount:    integer("discount_amount").default(0).notNull(),
    couponCode:        varchar("coupon_code", { length: 50 }),
    estimatedReadyAt:  timestamp("estimated_ready_at"),
    totalAmount:       integer("total_amount").notNull(),
    orderVersion:      integer("order_version").default(1).notNull(),
    idempotencyKey:    varchar("idempotency_key", { length: 100 }).unique(),
    checkoutSessionId: varchar("checkout_session_id", { length: 100 }).unique(),
    createdAt:         timestamp("created_at").defaultNow(),
    updatedAt:         timestamp("updated_at").defaultNow(),
    voidReason:        varchar("void_reason", { length: 255 }),
    isWaste:           boolean("is_waste").default(false).notNull(),
  },
  (table) => ({
    statusIdx:        index("orders_status_idx").on(table.status),
    orderTypeIdx:     index("orders_order_type_idx").on(table.orderType),
    customerPhoneIdx: index("orders_customer_phone_idx").on(table.customerPhone),
    createdAtIdx:     index("orders_created_at_idx").on(table.createdAt),
    updatedAtIdx:     index("orders_updated_at_idx").on(table.updatedAt),
    statusCreatedIdx: index("orders_status_created_idx").on(table.status, table.createdAt),
    riderIdIdx:       index("orders_rider_id_idx").on(table.riderId),
    waiterIdIdx:      index("orders_waiter_id_idx").on(table.waiterId),
    tableIdIdx:       index("orders_table_id_idx").on(table.tableId),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id:                  uuid("id").defaultRandom().primaryKey(),
    orderId:             varchar("order_id", { length: 12 })
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    menuItemId:          uuid("menu_item_id")
      .references(() => menuItems.id, { onDelete: "restrict" })
      .notNull(),
    variantId:           uuid("variant_id").references(() => itemVariants.id, { onDelete: "set null" }),
    itemName:            varchar("item_name", { length: 150 }).notNull(),
    variantName:         varchar("variant_name", { length: 50 }),
    quantity:            integer("quantity").notNull(),
    unitPrice:           integer("unit_price").notNull(),
    subtotal:            integer("subtotal").notNull(),
    status:              orderItemStatusEnum("status").default("pending").notNull(),
    roundNumber:         integer("round_number").default(1).notNull(),
    selectedAddOns:      jsonb("selected_add_ons"),
    specialInstructions: text("special_instructions"),
  },
  (table) => ({
    orderIdIdx:    index("order_items_order_id_idx").on(table.orderId),
    menuItemIdIdx: index("order_items_menu_item_id_idx").on(table.menuItemId),
  })
);

export const storeSettings = pgTable("store_settings", {
  key:       varchar("key", { length: 100 }).primaryKey(),
  value:     text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id:           uuid("id").defaultRandom().primaryKey(),
  menuItemId:   uuid("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" })
    .notNull(),
  customerName: varchar("customer_name", { length: 120 }).notNull(),
  rating:       integer("rating").notNull(),
  comment:      text("comment"),
  createdAt:    timestamp("created_at").defaultNow(),
});

// -----------------------------------------------------------------------------
// WhatsApp & State Tracking
// -----------------------------------------------------------------------------
export const orderStatusHistory = pgTable("order_status_history", {
  id:         uuid("id").defaultRandom().primaryKey(),
  orderId:    varchar("order_id", { length: 12 })
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus:   varchar("to_status", { length: 50 }).notNull(),
  source:     orderSourceEnum("source").default("system").notNull(),
  changedBy:  uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id:                  uuid("id").defaultRandom().primaryKey(),
  whatsappMessageId:   varchar("whatsapp_message_id", { length: 100 }).unique(),
  restaurantId:        varchar("restaurant_id", { length: 50 }).default("default").notNull(),
  phone:               varchar("phone", { length: 20 }).notNull(),
  direction:           whatsappMessageDirectionEnum("direction").notNull(),
  status:              whatsappMessageStatusEnum("status").default("pending").notNull(),
  payload:             jsonb("payload"),
  processedAt:         timestamp("processed_at"),
  attemptCount:        integer("attempt_count").default(0).notNull(),
  lastAttemptAt:       timestamp("last_attempt_at"),
  createdAt:           timestamp("created_at").defaultNow().notNull(),
});

export const whatsappSessions = pgTable(
  "whatsapp_sessions",
  {
    id:           uuid("id").defaultRandom().primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 50 }).default("default").notNull(),
    phone:        varchar("phone", { length: 20 }).notNull(),
    state:        whatsappSessionStateEnum("state").default("greeting").notNull(),
    cart:         jsonb("cart").$type<{ menuItemId: string; variantId?: string; quantity: number }[]>(),
    tempData:     jsonb("temp_data"),
    language:     varchar("language", { length: 10 }).default("en").notNull(),
    version:      integer("version").default(1).notNull(),
    lockedAt:     timestamp("locked_at"),
    expiresAt:    timestamp("expires_at"),
    createdAt:    timestamp("created_at").defaultNow().notNull(),
    updatedAt:    timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSession: unique("whatsapp_sessions_rest_phone_unq").on(table.restaurantId, table.phone),
  })
);

// -----------------------------------------------------------------------------
// Outbound Messages (Outbox Pattern)
// -----------------------------------------------------------------------------
export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id:            uuid("id").defaultRandom().primaryKey(),
    phone:         varchar("phone", { length: 20 }).notNull(),
    payload:       jsonb("payload").notNull(),
    status:        outboundMessageStatusEnum("status").default("pending").notNull(),
    attempts:      integer("attempts").default(0).notNull(),
    lastError:     text("last_error"),
    nextRetryAt:   timestamp("next_retry_at"),
    metaMessageId: varchar("meta_message_id", { length: 255 }),
    createdAt:     timestamp("created_at").defaultNow().notNull(),
    updatedAt:     timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx:    index("outbound_messages_status_idx").on(table.status),
    nextRetryIdx: index("outbound_messages_next_retry_idx").on(table.nextRetryAt),
  })
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  customerOrders:      many(orders, { relationName: "customerOrders" }),
  assignedDeliveries:  many(orders, { relationName: "riderDeliveries" }),
  waitedOrders:        many(orders, { relationName: "waiterOrders" }),
  riderProfile:        one(riderProfiles, { fields: [users.id], references: [riderProfiles.userId] }),
  staffPermissions:    one(staffPermissions, { fields: [users.id], references: [staffPermissions.userId] }),
  activityLogs:        many(activityLog),
}));



export const dealsRelations = relations(deals, ({ many }) => ({
  slots: many(dealSlots),
}));

export const dealSlotsRelations = relations(dealSlots, ({ one }) => ({
  deal: one(deals, {
    fields: [dealSlots.dealId],
    references: [deals.id],
  }),
  menuItem: one(menuItems, {
    fields: [dealSlots.menuItemId],
    references: [menuItems.id],
  }),
  category: one(categories, {
    fields: [dealSlots.categoryId],
    references: [categories.id],
  }),
}));

export const staffPermissionsRelations = relations(staffPermissions, ({ one }) => ({
  user: one(users, { fields: [staffPermissions.userId], references: [users.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
}));

export const riderProfilesRelations = relations(riderProfiles, ({ one }) => ({
  user: one(users, { fields: [riderProfiles.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category:   one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  variants:   many(itemVariants),
  addOns:     many(itemAddOns),
  orderItems: many(orderItems),
  reviews:    many(reviews),
}));

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  menuItem: one(menuItems, { fields: [itemVariants.menuItemId], references: [menuItems.id] }),
}));

export const itemAddOnsRelations = relations(itemAddOns, ({ one }) => ({
  menuItem: one(menuItems, { fields: [itemAddOns.menuItemId], references: [menuItems.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id], relationName: "customerOrders" }),
  rider:    one(users, { fields: [orders.riderId],    references: [users.id], relationName: "riderDeliveries" }),
  waiter:   one(users, { fields: [orders.waiterId],   references: [users.id], relationName: "waiterOrders" }),
  table:    one(restaurantTables, { fields: [orders.tableId], references: [restaurantTables.id] }),
  items:    many(orderItems),
}));

export const restaurantTablesRelations = relations(restaurantTables, ({ many }) => ({
  orders: many(orders),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order:    one(orders,       { fields: [orderItems.orderId],    references: [orders.id] }),
  menuItem: one(menuItems,    { fields: [orderItems.menuItemId], references: [menuItems.id] }),
  variant:  one(itemVariants, { fields: [orderItems.variantId],  references: [itemVariants.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  menuItem: one(menuItems, { fields: [reviews.menuItemId], references: [menuItems.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, { fields: [inventoryTransactions.inventoryItemId], references: [inventoryItems.id] }),
}));

export const shiftStatusEnum = pgEnum("shift_status", ["open", "closed"]);

export const registerShifts = pgTable(
  "register_shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    openedById: uuid("opened_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
    closedById: uuid("closed_by_id").references(() => users.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
    startingFloat: integer("starting_float").default(0).notNull(),
    expectedCash: integer("expected_cash").default(0).notNull(),
    actualCash: integer("actual_cash"),
    variance: integer("variance"),
    status: shiftStatusEnum("status").default("open").notNull(),
    notes: text("notes"),
  },
  (table) => ({
    statusIdx: index("register_shifts_status_idx").on(table.status),
    openedAtIdx: index("register_shifts_opened_at_idx").on(table.openedAt),
  })
);

export const registerShiftsRelations = relations(registerShifts, ({ one }) => ({
  openedBy: one(users, { fields: [registerShifts.openedById], references: [users.id], relationName: "openedBy" }),
  closedBy: one(users, { fields: [registerShifts.closedById], references: [users.id], relationName: "closedBy" }),
}));
