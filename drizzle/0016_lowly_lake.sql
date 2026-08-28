CREATE TYPE "public"."acquisition_request_status" AS ENUM('pending', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TABLE "acquisition_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"quality_profile_id" integer,
	"status" "acquisition_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"provider_item_id" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "requests_require_approval" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "acquisition_requests" ADD CONSTRAINT "acquisition_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_requests" ADD CONSTRAINT "acquisition_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acquisition_requests_status_created_idx" ON "acquisition_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "acquisition_requests_user_created_idx" ON "acquisition_requests" USING btree ("user_id","created_at");