CREATE TYPE "public"."hall_type" AS ENUM('general', 'family');--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "hall_type" "hall_type" DEFAULT 'general' NOT NULL;