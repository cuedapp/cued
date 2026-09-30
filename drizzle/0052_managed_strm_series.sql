CREATE TABLE "managed_strm_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"playlist_uuid" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"relative_directory" text NOT NULL,
	"requester_id" uuid,
	"written_episodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"available_episodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "managed_strm_series" ADD CONSTRAINT "managed_strm_series_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_strm_series" ADD CONSTRAINT "managed_strm_series_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "managed_strm_series_integration_tmdb_idx" ON "managed_strm_series" USING btree ("integration_id","tmdb_id");