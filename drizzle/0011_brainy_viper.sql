CREATE TABLE "recommendation_refresh_states" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"signal_fingerprint" text NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"poster_path" text,
	"release_date" text,
	"genre_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" real NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" text,
	"hidden_at" timestamp with time zone,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recommendation_refresh_states" ADD CONSTRAINT "recommendation_refresh_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recommendations_user_title_idx" ON "recommendations" USING btree ("user_id","media_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "recommendations_user_score_idx" ON "recommendations" USING btree ("user_id","score");