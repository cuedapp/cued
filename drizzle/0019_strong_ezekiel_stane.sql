CREATE TABLE "follow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"event_type" text NOT NULL,
	"related_type" text,
	"related_tmdb_id" integer,
	"related_title" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"title" text NOT NULL,
	"image_path" text,
	"release_date" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_state" text,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "follow_events" ADD CONSTRAINT "follow_events_follow_id_follows_id_fk" FOREIGN KEY ("follow_id") REFERENCES "public"."follows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_events" ADD CONSTRAINT "follow_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "follow_events_user_key_idx" ON "follow_events" USING btree ("user_id","event_key");--> statement-breakpoint
CREATE INDEX "follow_events_user_occurred_idx" ON "follow_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_user_target_idx" ON "follows" USING btree ("user_id","target_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "follows_user_created_idx" ON "follows" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "follows_checked_idx" ON "follows" USING btree ("last_checked_at");