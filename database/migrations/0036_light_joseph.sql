CREATE TYPE "public"."table_zone" AS ENUM('general', 'outdoor', 'family');--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "table_zone" "table_zone" DEFAULT 'general' NOT NULL;