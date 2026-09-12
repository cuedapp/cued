CREATE TABLE "ai_chat_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"usage_date" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_chat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_chat_daily_limit" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_chat_usage" ADD CONSTRAINT "ai_chat_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_chat_usage_user_date_idx" ON "ai_chat_usage" USING btree ("user_id","usage_date");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ai_chat_daily_limit" CHECK ("users"."ai_chat_daily_limit" BETWEEN 1 AND 100);