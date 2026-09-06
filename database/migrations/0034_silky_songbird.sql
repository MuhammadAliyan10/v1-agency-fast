ALTER TABLE "deal_slots" ADD COLUMN "is_text_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_slots" ADD COLUMN "fallback_display_name" varchar(150);--> statement-breakpoint
ALTER TABLE "deal_slots" ADD COLUMN "fallback_unit_price" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "deal_selections" jsonb;