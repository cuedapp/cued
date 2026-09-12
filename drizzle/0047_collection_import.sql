CREATE TABLE "media_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"jellyfin_item_id" text NOT NULL,
	"name" text NOT NULL,
	"tmdb_id" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"raw" jsonb NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_collection_items" ADD CONSTRAINT "media_collection_items_collection_id_media_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."media_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_collection_items" ADD CONSTRAINT "media_collection_items_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_collections" ADD CONSTRAINT "media_collections_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_collection_items_collection_media_idx" ON "media_collection_items" USING btree ("collection_id","media_item_id");--> statement-breakpoint
CREATE INDEX "media_collection_items_media_idx" ON "media_collection_items" USING btree ("media_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_collections_integration_jellyfin_idx" ON "media_collections" USING btree ("integration_id","jellyfin_item_id");--> statement-breakpoint
CREATE INDEX "media_collections_tmdb_idx" ON "media_collections" USING btree ("tmdb_id");