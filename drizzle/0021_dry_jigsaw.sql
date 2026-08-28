ALTER TABLE "notification_preferences" ADD COLUMN "base_url" text DEFAULT 'https://ntfy.sh' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "encrypted_token" text;