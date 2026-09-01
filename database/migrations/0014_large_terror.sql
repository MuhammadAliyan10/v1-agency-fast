CREATE TYPE "public"."order_item_status" AS ENUM('pending', 'preparing', 'served');--> statement-breakpoint
ALTER TYPE "public"."order_type" ADD VALUE 'dine_in';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "status" "order_item_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "round_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "table_number" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "waiter_name" varchar(120);