ALTER TABLE "recommendations" ADD COLUMN "rating" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "popularity" real DEFAULT 0 NOT NULL;