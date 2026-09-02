CREATE TYPE "public"."shift_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "register_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opened_by_id" uuid NOT NULL,
	"closed_by_id" uuid,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"starting_float" integer DEFAULT 0 NOT NULL,
	"expected_cash" integer DEFAULT 0 NOT NULL,
	"actual_cash" integer,
	"variance" integer,
	"status" "shift_status" DEFAULT 'open' NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "void_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_waste" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "register_shifts" ADD CONSTRAINT "register_shifts_opened_by_id_users_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "register_shifts" ADD CONSTRAINT "register_shifts_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "register_shifts_status_idx" ON "register_shifts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "register_shifts_opened_at_idx" ON "register_shifts" USING btree ("opened_at");