CREATE TABLE "user_media_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"rating" integer,
	"feedback" text,
	"excluded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_media_feedback_rating_range" CHECK ("user_media_feedback"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "user_taste_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"onboarding_status" text DEFAULT 'pending' NOT NULL,
	"source_media_count" integer DEFAULT 0 NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_media_feedback" ADD CONSTRAINT "user_media_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_media_feedback" ADD CONSTRAINT "user_media_feedback_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD CONSTRAINT "user_taste_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_media_feedback_user_item_idx" ON "user_media_feedback" USING btree ("user_id","media_item_id");--> statement-breakpoint
CREATE INDEX "user_media_feedback_user_updated_idx" ON "user_media_feedback" USING btree ("user_id","updated_at");