ALTER TYPE "public"."user_role" ADD VALUE 'waiter' BEFORE 'rider';--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"can_manage_menu" boolean DEFAULT true NOT NULL,
	"can_view_finance" boolean DEFAULT true NOT NULL,
	"can_manage_coupons" boolean DEFAULT true NOT NULL,
	"can_view_inventory" boolean DEFAULT true NOT NULL,
	"can_broadcast_whatsapp" boolean DEFAULT false NOT NULL,
	"can_manage_staff" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_permissions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "waiter_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_user_id_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_created_type_idx" ON "activity_log" USING btree ("created_at","target_type");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_waiter_id_idx" ON "orders" USING btree ("waiter_id");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");