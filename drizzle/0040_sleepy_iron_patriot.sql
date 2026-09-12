ALTER TABLE "media_items" ADD COLUMN "content_rating" text;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "content_rating_age" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "maximum_content_rating_age" integer;--> statement-breakpoint
UPDATE "media_items"
SET "content_rating" = NULLIF(BTRIM("raw"->>'OfficialRating'), '')
WHERE NULLIF(BTRIM("raw"->>'OfficialRating'), '') IS NOT NULL;--> statement-breakpoint
UPDATE "media_items"
SET "content_rating_age" = CASE
  WHEN UPPER("content_rating") IN ('G', 'TV-Y', 'TV-G', 'U', 'AL', 'ALL', '0', 'L') THEN 0
  WHEN UPPER("content_rating") IN ('PG', 'TV-Y7', 'TV-Y7-FV', '6', '7', '9', 'TP') THEN 7
  WHEN UPPER("content_rating") IN ('PG-13', 'TV-PG', '10', '11', '12', '12A', '13', 'SAM 13') THEN 12
  WHEN UPPER("content_rating") IN ('TV-14', '14', '15', '16', 'R', 'K-16', '16+') THEN 16
  WHEN UPPER("content_rating") IN ('TV-MA', '17', '18', '18+', 'NC-17', 'X', 'R18', 'R18+', 'K-18') THEN 18
  ELSE NULL
END
WHERE "content_rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "media_items_content_rating_idx" ON "media_items" USING btree ("content_rating_age");--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_content_rating_age" CHECK ("media_items"."content_rating_age" IS NULL OR "media_items"."content_rating_age" IN (0, 7, 12, 16, 18));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_maximum_content_rating_age" CHECK ("users"."maximum_content_rating_age" IS NULL OR "users"."maximum_content_rating_age" IN (7, 12, 16, 18));
