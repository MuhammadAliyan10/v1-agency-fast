CREATE TYPE "public"."outbound_message_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'retry');--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbound_message_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp,
	"meta_message_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_session_id" varchar(100);--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD COLUMN "locked_at" timestamp;--> statement-breakpoint
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_messages_next_retry_idx" ON "outbound_messages" USING btree ("next_retry_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_unique" UNIQUE("checkout_session_id");