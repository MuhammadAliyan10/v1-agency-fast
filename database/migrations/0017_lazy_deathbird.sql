ALTER TYPE "public"."payment_status" ADD VALUE 'collected_by_rider';--> statement-breakpoint
ALTER TABLE "staff_permissions" ADD COLUMN "max_discount_percentage" integer DEFAULT 0 NOT NULL;