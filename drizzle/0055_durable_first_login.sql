ALTER TABLE "installation_bootstrap" ADD COLUMN "first_login_completed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Recover pre-bootstrap installations conservatively, without treating a completed
-- scheduled import as a login when an existing bootstrap explicitly remains pending.
INSERT INTO "installation_bootstrap" ("id", "first_login_completed")
SELECT 1, EXISTS (SELECT 1 FROM "integration_sync_runs" WHERE "status" = 'completed')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Bootstrap progress survives deleted users, unlike per-user login history.
UPDATE "installation_bootstrap"
SET "first_login_completed" = true
WHERE "id" = 1 AND (
	EXISTS (SELECT 1 FROM "users" WHERE "last_login_at" IS NOT NULL)
	OR EXISTS (SELECT 1 FROM "sessions")
	OR "status" <> 'pending'
	OR "phase" <> 'waiting'
	OR "user_id" IS NOT NULL
	OR "started_at" IS NOT NULL
	OR "completed_at" IS NOT NULL
	OR EXISTS (
		SELECT 1 FROM "integration_sync_runs"
		WHERE "trigger" = 'login'
	)
);