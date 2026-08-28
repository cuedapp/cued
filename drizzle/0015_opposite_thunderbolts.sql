ALTER TABLE "integrations" ADD COLUMN "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "ai_score" real;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "ai_explanation" text;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD COLUMN "signal_fingerprint" text;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD COLUMN "generated_at" timestamp with time zone;