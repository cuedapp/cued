UPDATE "recommendation_refresh_states"
SET
  "refreshed_at" = to_timestamp(0),
  "refresh_after" = now();
