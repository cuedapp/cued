DROP INDEX "external_media_availability_provider_title_idx";--> statement-breakpoint
ALTER TABLE "external_media_availability" ADD COLUMN "group_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "external_media_availability_provider_source_idx" ON "external_media_availability" USING btree ("integration_id","media_type","external_id");