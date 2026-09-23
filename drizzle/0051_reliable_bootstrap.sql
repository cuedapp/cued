CREATE TABLE "installation_bootstrap" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"phase" text DEFAULT 'waiting' NOT NULL,
	"user_id" uuid,
	"locale" text DEFAULT 'en' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installation_bootstrap_singleton" CHECK ("installation_bootstrap"."id" = 1),
	CONSTRAINT "installation_bootstrap_status" CHECK ("installation_bootstrap"."status" IN ('pending', 'running', 'failed', 'completed')),
	CONSTRAINT "installation_bootstrap_phase" CHECK ("installation_bootstrap"."phase" IN ('waiting', 'syncing', 'recommendations', 'ready'))
);
--> statement-breakpoint
ALTER TABLE "installation_bootstrap" ADD CONSTRAINT "installation_bootstrap_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "installation_bootstrap" ("id", "status", "phase", "completed_at")
SELECT
	1,
	CASE WHEN EXISTS (
		SELECT 1 FROM "integration_sync_runs" WHERE "status" = 'completed'
	) THEN 'completed' ELSE 'pending' END,
	CASE WHEN EXISTS (
		SELECT 1 FROM "integration_sync_runs" WHERE "status" = 'completed'
	) THEN 'ready' ELSE 'waiting' END,
	CASE WHEN EXISTS (
		SELECT 1 FROM "integration_sync_runs" WHERE "status" = 'completed'
	) THEN now() ELSE NULL END;