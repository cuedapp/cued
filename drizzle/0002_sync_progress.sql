ALTER TABLE "integration_sync_runs" ADD COLUMN "phase" text DEFAULT 'preparing' NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD COLUMN "current_label" text;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD COLUMN "libraries_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD COLUMN "users_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
