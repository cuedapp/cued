CREATE TABLE "media_rating_refresh_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"last_attempt_at" timestamp with time zone NOT NULL,
	"last_success_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "media_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"source" text NOT NULL,
	"value" real NOT NULL,
	"scale" integer NOT NULL,
	"normalized_score" real NOT NULL,
	"votes" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_rating_refresh_title_idx" ON "media_rating_refresh_states" USING btree ("media_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "media_rating_refresh_attempt_idx" ON "media_rating_refresh_states" USING btree ("last_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_ratings_title_source_idx" ON "media_ratings" USING btree ("media_type","tmdb_id","source");--> statement-breakpoint
CREATE INDEX "media_ratings_source_score_idx" ON "media_ratings" USING btree ("source","normalized_score");