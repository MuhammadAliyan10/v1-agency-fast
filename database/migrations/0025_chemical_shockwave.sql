CREATE TYPE "public"."inventory_transaction_type" AS ENUM('restock', 'consumption', 'adjustment', 'waste');--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"type" "inventory_transaction_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"reference_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "orders_created_status_idx";--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "sku" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "cost_per_unit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "supplier_name" varchar(150);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "last_restocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "created_by_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_permissions" ADD COLUMN "permissions" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_manage_menu";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_view_finance";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_manage_coupons";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_view_inventory";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_broadcast_whatsapp";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_manage_staff";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_update_orders";--> statement-breakpoint
ALTER TABLE "staff_permissions" DROP COLUMN "can_cancel_orders";--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sku_unique" UNIQUE("sku");