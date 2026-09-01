ALTER TYPE "public"."whatsapp_session_state" ADD VALUE 'language_selection' BEFORE 'greeting';--> statement-breakpoint
ALTER TYPE "public"."whatsapp_session_state" ADD VALUE 'previous_details_prompt' BEFORE 'name_input';--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD COLUMN "language" varchar(10) DEFAULT 'en' NOT NULL;