ALTER TABLE "whatsapp_messages" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "last_attempt_at" timestamp;