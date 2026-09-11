UPDATE "media_items"
SET "content_rating_age" = CASE
  WHEN UPPER("content_rating") = 'BTL' OR UPPER("content_rating") LIKE '%-BTL' THEN 0
  WHEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer <= 9 THEN 7
  WHEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer <= 13 THEN 12
  WHEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer <= 16 THEN 16
  WHEN SUBSTRING("content_rating" FROM '([0-9]{1,2})')::integer <= 21 THEN 18
  ELSE NULL
END
WHERE "content_rating_age" IS NULL
  AND "content_rating" IS NOT NULL
  AND (
    UPPER("content_rating") = 'BTL'
    OR UPPER("content_rating") LIKE '%-BTL'
    OR SUBSTRING("content_rating" FROM '([0-9]{1,2})') IS NOT NULL
  );
