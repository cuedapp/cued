CREATE TABLE "application_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"show_server_statistics_to_users" boolean DEFAULT false NOT NULL,
	"show_recent_activity_to_users" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
