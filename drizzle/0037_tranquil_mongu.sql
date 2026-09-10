ALTER TABLE "notification_preferences" RENAME COLUMN "strong_recommendations" TO "recommendation_updates";--> statement-breakpoint
ALTER TABLE "notification_preferences" RENAME COLUMN "followed_requestable" TO "request_updates";--> statement-breakpoint
ALTER TABLE "notification_preferences" RENAME COLUMN "new_seasons" TO "following_updates";