ALTER TABLE "media_items" DROP CONSTRAINT "media_items_content_rating_age";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_maximum_content_rating_age";--> statement-breakpoint
UPDATE "media_items"
SET "content_rating_age" = CASE
  WHEN UPPER("content_rating") IN ('G', 'TV-Y', 'TV-G', 'U', 'AL', 'ALL', '0', 'L', 'BTL')
    OR UPPER("content_rating") LIKE '%-BTL' THEN 0
  WHEN UPPER("content_rating") IN ('PG', 'TV-Y7', 'TV-Y7-FV', 'TV-PG', 'TP') THEN 7
  WHEN UPPER("content_rating") IN ('PG-13', 'SAM 13') THEN 13
  WHEN UPPER("content_rating") = 'TV-14' THEN 14
  WHEN UPPER("content_rating") = 'R' THEN 17
  WHEN UPPER("content_rating") IN ('TV-MA', 'NC-17', 'X', 'R18', 'R18+', 'K-18') THEN 18
  WHEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer BETWEEN 0 AND 18
    THEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer
  ELSE NULL
END
WHERE "content_rating" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_content_rating_age" CHECK ("media_items"."content_rating_age" IS NULL OR "media_items"."content_rating_age" BETWEEN 0 AND 18);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_maximum_content_rating_age" CHECK ("users"."maximum_content_rating_age" IS NULL OR "users"."maximum_content_rating_age" BETWEEN 0 AND 18);
