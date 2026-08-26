CREATE TABLE "user_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"normalized_query" text NOT NULL,
	"last_searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_searches" ADD CONSTRAINT "user_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_searches_user_normalized_query_idx" ON "user_searches" USING btree ("user_id","normalized_query");--> statement-breakpoint
CREATE INDEX "user_searches_user_last_searched_idx" ON "user_searches" USING btree ("user_id","last_searched_at");