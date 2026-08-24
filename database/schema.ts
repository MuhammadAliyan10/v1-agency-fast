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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "rider",
  "customer",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "approved",
  "preparing",
  "delayed",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "COD",
  "JazzCash",
  "EasyPaisa",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "refunded",
]);

export const riderStatusEnum = pgEnum("rider_status", [
  "available",
  "busy",
  "offline",
]);

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").default("customer").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    phoneIdx: index("users_phone_idx").on(table.phone),
    roleIdx: index("users_role_idx").on(table.role),
  })
);

export const riderProfiles = pgTable("rider_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  vehicleType: varchar("vehicle_type", { length: 50 }).default("bike"),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }),
  status: riderStatusEnum("status").default("offline"),
  currentOrderId: varchar("current_order_id", { length: 12 }),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    description: text("description"),
    basePrice: integer("base_price").notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    isAvailable: boolean("is_available").default(true),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    categoryIdx: index("menu_items_category_id_idx").on(table.categoryId),
    availableIdx: index("menu_items_is_available_idx").on(table.isAvailable),
  })
);

export const itemVariants = pgTable("item_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  menuItemId: uuid("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const itemAddOns = pgTable("item_add_ons", {
  id: uuid("id").defaultRandom().primaryKey(),
  menuItemId: uuid("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  unit: varchar("unit", { length: 50 }).notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
});

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 12 }).primaryKey(),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    riderId: uuid("rider_id").references(() => users.id, { onDelete: "set null" }),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryNotes: text("delivery_notes"),
    status: orderStatusEnum("status").default("pending").notNull(),
    delayReason: text("delay_reason"),
    rejectionReason: text("rejection_reason"),
    paymentMethod: paymentMethodEnum("payment_method").default("COD").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").default(0).notNull(),
    discountAmount: integer("discount_amount").default(0).notNull(),
    totalAmount: integer("total_amount").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 100 }).unique(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
    customerPhoneIdx: index("orders_customer_phone_idx").on(table.customerPhone),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
    riderIdIdx: index("orders_rider_id_idx").on(table.riderId),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: varchar("order_id", { length: 12 })
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    menuItemId: uuid("menu_item_id")
      .references(() => menuItems.id, { onDelete: "restrict" })
      .notNull(),
    variantId: uuid("variant_id").references(() => itemVariants.id, { onDelete: "set null" }),
    itemName: varchar("item_name", { length: 150 }).notNull(),
    variantName: varchar("variant_name", { length: 50 }),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    selectedAddOns: jsonb("selected_add_ons"),
    specialInstructions: text("special_instructions"),
  },
  (table) => ({
    orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
    menuItemIdIdx: index("order_items_menu_item_id_idx").on(table.menuItemId),
  })
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  customerOrders: many(orders, { relationName: "customerOrders" }),
  assignedDeliveries: many(orders, { relationName: "riderDeliveries" }),
  riderProfile: one(riderProfiles, {
    fields: [users.id],
    references: [riderProfiles.userId],
  }),
}));

export const riderProfilesRelations = relations(riderProfiles, ({ one }) => ({
  user: one(users, {
    fields: [riderProfiles.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  variants: many(itemVariants),
  addOns: many(itemAddOns),
  orderItems: many(orderItems),
}));

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemVariants.menuItemId],
    references: [menuItems.id],
  }),
}));

export const itemAddOnsRelations = relations(itemAddOns, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemAddOns.menuItemId],
    references: [menuItems.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
    relationName: "customerOrders",
  }),
  rider: one(users, {
    fields: [orders.riderId],
    references: [users.id],
    relationName: "riderDeliveries",
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  variant: one(itemVariants, {
    fields: [orderItems.variantId],
    references: [itemVariants.id],
  }),
}));
