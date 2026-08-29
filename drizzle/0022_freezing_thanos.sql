CREATE TABLE "external_media_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_media_availability" ADD CONSTRAINT "external_media_availability_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_media_availability_provider_title_idx" ON "external_media_availability" USING btree ("integration_id","media_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "external_media_availability_lookup_idx" ON "external_media_availability" USING btree ("media_type","tmdb_id");