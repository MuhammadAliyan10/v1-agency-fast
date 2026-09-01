CREATE TABLE "deal_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"slot_name" varchar(150) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"menu_item_id" uuid,
	"category_id" uuid,
	"required_variant_name" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_slots" ADD CONSTRAINT "deal_slots_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_slots" ADD CONSTRAINT "deal_slots_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_slots" ADD CONSTRAINT "deal_slots_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_slots_deal_id_idx" ON "deal_slots" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deals_is_archived_idx" ON "deals" USING btree ("is_archived");