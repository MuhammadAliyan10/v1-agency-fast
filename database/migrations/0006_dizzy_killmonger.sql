CREATE TYPE "public"."order_source" AS ENUM('website', 'whatsapp', 'qr', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'processed');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_session_state" AS ENUM('greeting', 'category_selection', 'item_selection', 'cart_review', 'checkout', 'name_input', 'address_input', 'order_confirmation', 'order_created', 'human_handoff', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(12) NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"source" "order_source" DEFAULT 'system' NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_message_id" varchar(100) NOT NULL,
	"restaurant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"phone" varchar(20) NOT NULL,
	"direction" "whatsapp_message_direction" NOT NULL,
	"status" "whatsapp_message_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_whatsapp_message_id_unique" UNIQUE("whatsapp_message_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar(50) DEFAULT 'default' NOT NULL,
	"phone" varchar(20) NOT NULL,
	"state" "whatsapp_session_state" DEFAULT 'greeting' NOT NULL,
	"cart" jsonb,
	"temp_data" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_sessions_rest_phone_unq" UNIQUE("restaurant_id","phone")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" "order_source" DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;