CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "orders_created_status_idx" ON "orders" USING btree ("created_at","status");