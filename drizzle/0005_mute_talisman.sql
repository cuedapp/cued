CREATE TABLE "metadata_cache_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"cache_key" text NOT NULL,
	"locale" text NOT NULL,
	"resource_type" text NOT NULL,
	"external_id" text,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "tmdb_id" integer;--> statement-breakpoint
UPDATE "media_items"
SET "tmdb_id" = (("raw" -> 'ProviderIds' ->> 'Tmdb')::integer)
WHERE ("raw" -> 'ProviderIds' ->> 'Tmdb') ~ '^[0-9]+$';--> statement-breakpoint
CREATE UNIQUE INDEX "metadata_cache_provider_key_locale_idx" ON "metadata_cache_entries" USING btree ("provider","cache_key","locale");--> statement-breakpoint
CREATE INDEX "metadata_cache_expiry_idx" ON "metadata_cache_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "media_items_tmdb_kind_idx" ON "media_items" USING btree ("tmdb_id","kind");
