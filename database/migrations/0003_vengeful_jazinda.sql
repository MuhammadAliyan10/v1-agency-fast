CREATE TYPE "public"."deal_type" AS ENUM('combo', 'event');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('flat', 'percent');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('delivery', 'pickup');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'ready_for_pickup' BEFORE 'delayed';--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255),
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"applicable_item_ids" jsonb,
	"min_order_amount" integer DEFAULT 0,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"image_url" varchar(500),
	"deal_type" "deal_type" DEFAULT 'combo' NOT NULL,
	"event_label" varchar(100),
	"original_price" integer NOT NULL,
	"deal_price" integer NOT NULL,
	"items" jsonb NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "delivery_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "preparation_time" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" "order_type" DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" varchar(50);--> statement-breakpoint
CREATE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_is_active_idx" ON "coupons" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "deals_is_active_idx" ON "deals" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "deals_valid_until_idx" ON "deals" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "orders_order_type_idx" ON "orders" USING btree ("order_type");