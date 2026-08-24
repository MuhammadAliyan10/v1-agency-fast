import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type Category = InferSelectModel<typeof schema.categories>;
export type NewCategory = InferInsertModel<typeof schema.categories>;

export type MenuItem = InferSelectModel<typeof schema.menuItems>;
export type NewMenuItem = InferInsertModel<typeof schema.menuItems>;

export type ItemVariant = InferSelectModel<typeof schema.itemVariants>;
export type NewItemVariant = InferInsertModel<typeof schema.itemVariants>;

export type ItemAddOn = InferSelectModel<typeof schema.itemAddOns>;
export type NewItemAddOn = InferInsertModel<typeof schema.itemAddOns>;

export type Order = InferSelectModel<typeof schema.orders>;
export type NewOrder = InferInsertModel<typeof schema.orders>;

export type OrderItem = InferSelectModel<typeof schema.orderItems>;
export type NewOrderItem = InferInsertModel<typeof schema.orderItems>;

export type OrderWithRelations = Order & {
  customer: User | null;
  rider: User | null;
  items: (OrderItem & {
    menuItem: MenuItem;
    variant: ItemVariant | null;
  })[];
};

export type MenuItemWithDetails = MenuItem & {
  category: Category;
  variants: ItemVariant[];
  addOns: ItemAddOn[];
};
