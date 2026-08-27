ALTER TABLE "users" ADD COLUMN "date_format" text DEFAULT 'yyyy-mm-dd' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time_format" text DEFAULT '24h' NOT NULL;