ALTER TABLE "users" ADD COLUMN "access_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;