ALTER TABLE "orders" ADD COLUMN "tracking_token" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tracking_token_unique" UNIQUE("tracking_token");