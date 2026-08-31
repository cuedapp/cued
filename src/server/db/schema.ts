import { boolean, check, index, integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const integrationStatus = pgEnum("integration_status", ["unconfigured", "healthy", "degraded"]);
export const syncStatus = pgEnum("sync_status", ["running", "completed", "failed"]);
export const syncTrigger = pgEnum("sync_trigger", ["manual", "login", "scheduled"]);
export const mediaKind = pgEnum("media_kind", ["movie", "series", "season", "episode"]);
export const acquisitionRequestStatus = pgEnum("acquisition_request_status", ["pending", "approved", "rejected", "failed"]);

export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  encryptedApiKey: text("encrypted_api_key"),
  encryptedApiToken: text("encrypted_api_token"),
  serverId: text("server_id"),
  serverName: text("server_name"),
  serverVersion: text("server_version"),
  status: integrationStatus("status").notNull().default("unconfigured"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  failureStartedAt: timestamp("failure_started_at", { withTimezone: true }),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  jellyfinUserId: text("jellyfin_user_id").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  primaryImageTag: text("primary_image_tag"),
  role: userRole("role").notNull().default("user"),
  disabled: boolean("disabled").notNull().default(false),
  dateFormat: text("date_format").notNull().default("yyyy-mm-dd"),
  timeFormat: text("time_format").notNull().default("24h"),
  requestsRequireApproval: boolean("requests_require_approval").notNull().default(true),
  locale: text("locale").notNull().default("en"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_integration_jellyfin_user_idx").on(table.integrationId, table.jellyfinUserId)]);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  baseUrl: text("base_url").notNull().default("https://ntfy.sh"),
  encryptedToken: text("encrypted_token"),
  topic: text("topic").notNull().default(""),
  strongRecommendations: boolean("strong_recommendations").notNull().default(true),
  followedRequestable: boolean("followed_requestable").notNull().default(true),
  newSeasons: boolean("new_seasons").notNull().default(true),
  persistentFailures: boolean("persistent_failures").notNull().default(true),
  updates: boolean("updates").notNull().default(true),
  minimumMatch: integer("minimum_match").notNull().default(85),
  failureThreshold: integer("failure_threshold").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("notification_preferences_match_range", sql`${table.minimumMatch} BETWEEN 50 AND 100`),
  check("notification_preferences_failure_range", sql`${table.failureThreshold} BETWEEN 1 AND 20`),
]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  eventKey: text("event_key").notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  clickUrl: text("click_url"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("notification_deliveries_user_provider_event_idx").on(table.userId, table.provider, table.eventKey),
  index("notification_deliveries_pending_idx").on(table.status, table.nextAttemptAt),
]);

export const userNotifications = pgTable("user_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("user_notifications_user_created_idx").on(table.userId, table.createdAt)]);

export const externalMediaAvailability = pgTable("external_media_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  groupName: text("group_name"),
  containerExtension: text("container_extension"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("external_media_availability_provider_source_idx").on(table.integrationId, table.mediaType, table.externalId),
  index("external_media_availability_lookup_idx").on(table.mediaType, table.tmdbId),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaLibraries = pgTable("media_libraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  jellyfinLibraryId: text("jellyfin_library_id").notNull(),
  name: text("name").notNull(),
  collectionType: text("collection_type"),
  selected: boolean("selected").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("media_libraries_integration_jellyfin_idx").on(table.integrationId, table.jellyfinLibraryId)]);

export const userLibraryAccess = pgTable("user_library_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  libraryId: uuid("library_id").notNull().references(() => mediaLibraries.id, { onDelete: "cascade" }),
  accessible: boolean("accessible").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("user_library_access_user_library_idx").on(table.userId, table.libraryId)]);

export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  jellyfinItemId: text("jellyfin_item_id").notNull(),
  jellyfinLibraryId: text("jellyfin_library_id"),
  kind: mediaKind("kind").notNull(),
  name: text("name").notNull(),
  tmdbId: integer("tmdb_id"),
  seriesJellyfinId: text("series_jellyfin_id"),
  seasonJellyfinId: text("season_jellyfin_id"),
  parentJellyfinId: text("parent_jellyfin_id"),
  premiereDate: timestamp("premiere_date", { withTimezone: true }),
  runtimeTicks: text("runtime_ticks"),
  raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("media_items_integration_jellyfin_idx").on(table.integrationId, table.jellyfinItemId),
  index("media_items_tmdb_kind_idx").on(table.tmdbId, table.kind),
]);

export const metadataCacheEntries = pgTable("metadata_cache_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  cacheKey: text("cache_key").notNull(),
  locale: text("locale").notNull(),
  resourceType: text("resource_type").notNull(),
  externalId: text("external_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("metadata_cache_provider_key_locale_idx").on(table.provider, table.cacheKey, table.locale),
  index("metadata_cache_expiry_idx").on(table.expiresAt),
]);

export const userSearches = pgTable("user_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  normalizedQuery: text("normalized_query").notNull(),
  lastSearchedAt: timestamp("last_searched_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_searches_user_normalized_query_idx").on(table.userId, table.normalizedQuery),
  index("user_searches_user_last_searched_idx").on(table.userId, table.lastSearchedAt),
]);

export const userMediaFeedback = pgTable("user_media_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaItemId: uuid("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  feedback: text("feedback"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  excluded: boolean("excluded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_media_feedback_user_item_idx").on(table.userId, table.mediaItemId),
  index("user_media_feedback_user_updated_idx").on(table.userId, table.updatedAt),
  check("user_media_feedback_rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
]);

export const userTasteProfiles = pgTable("user_taste_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  onboardingStatus: text("onboarding_status").notNull().default("pending"),
  sourceMediaCount: integer("source_media_count").notNull().default(0),
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
  signalFingerprint: text("signal_fingerprint"),
  provider: text("provider"),
  model: text("model"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  title: text("title").notNull(),
  overview: text("overview").notNull().default(""),
  posterPath: text("poster_path"),
  releaseDate: text("release_date"),
  genreIds: jsonb("genre_ids").$type<number[]>().notNull().default([]),
  score: real("score").notNull(),
  matchPercent: integer("match_percent").notNull().default(0),
  reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
  sourceTitles: jsonb("source_titles").$type<Array<{ id: number; type: "movie" | "series"; title: string; reason: "liked" | "watched" }>>().notNull().default([]),
  aiScore: real("ai_score"),
  aiExplanation: text("ai_explanation"),
  feedback: text("feedback"),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("recommendations_user_title_idx").on(table.userId, table.mediaType, table.tmdbId),
  index("recommendations_user_score_idx").on(table.userId, table.score),
]);

export const recommendationRefreshStates = pgTable("recommendation_refresh_states", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  signalFingerprint: text("signal_fingerprint").notNull(),
  locale: text("locale").notNull().default("en"),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull().defaultNow(),
  refreshAfter: timestamp("refresh_after", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recommendationRuns = pgTable("recommendation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("running"),
  phase: text("phase").notNull().default("preparing"),
  processedItems: integer("processed_items").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("recommendation_runs_user_started_idx").on(table.userId, table.startedAt),
  uniqueIndex("recommendation_runs_user_running_idx").on(table.userId).where(sql`${table.status} = 'running'`),
]);

export const userMediaStates = pgTable("user_media_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaItemId: uuid("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  played: boolean("played").notNull().default(false),
  playCount: integer("play_count").notNull().default(0),
  playedPercentage: real("played_percentage"),
  playbackPositionTicks: text("playback_position_ticks"),
  lastPlayedAt: timestamp("last_played_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("user_media_states_user_item_idx").on(table.userId, table.mediaItemId)]);

export const integrationSyncRuns = pgTable("integration_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
  trigger: syncTrigger("trigger").notNull(),
  mode: text("mode").notNull().default("full"),
  status: syncStatus("status").notNull().default("running"),
  phase: text("phase").notNull().default("preparing"),
  currentLabel: text("current_label"),
  librariesProcessed: integer("libraries_processed").notNull().default(0),
  librariesTotal: integer("libraries_total").notNull().default(0),
  itemsProcessed: integer("items_processed").notNull().default(0),
  usersProcessed: integer("users_processed").notNull().default(0),
  usersTotal: integer("users_total").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
});

export const acquisitionRequests = pgTable("acquisition_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  rootFolderPath: text("root_folder_path"),
  qualityProfileId: integer("quality_profile_id"),
  status: acquisitionRequestStatus("status").notNull().default("pending"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  providerItemId: integer("provider_item_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("acquisition_requests_status_created_idx").on(table.status, table.createdAt),
  index("acquisition_requests_user_created_idx").on(table.userId, table.createdAt),
  uniqueIndex("acquisition_requests_pending_title_idx").on(table.mediaType, table.tmdbId).where(sql`${table.status} = 'pending'`),
]);

export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  locale: text("locale").notNull().default("en"),
  title: text("title").notNull(),
  imagePath: text("image_path"),
  releaseDate: text("release_date"),
  snapshot: jsonb("snapshot").$type<{ seasonCount?: number; creditKeys?: string[] }>().notNull().default({}),
  requestState: text("request_state"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("follows_user_target_idx").on(table.userId, table.targetType, table.tmdbId),
  index("follows_user_created_idx").on(table.userId, table.createdAt),
  index("follows_checked_idx").on(table.lastCheckedAt),
]);

export const followEvents = pgTable("follow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  followId: uuid("follow_id").notNull().references(() => follows.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventKey: text("event_key").notNull(),
  eventType: text("event_type").notNull(),
  relatedType: text("related_type"),
  relatedTmdbId: integer("related_tmdb_id"),
  relatedTitle: text("related_title"),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  seenAt: timestamp("seen_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("follow_events_user_key_idx").on(table.userId, table.eventKey),
  index("follow_events_user_occurred_idx").on(table.userId, table.occurredAt),
]);

export type User = typeof users.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type MetadataCacheEntry = typeof metadataCacheEntries.$inferSelect;
export type UserSearch = typeof userSearches.$inferSelect;
export type UserMediaFeedback = typeof userMediaFeedback.$inferSelect;
export type UserTasteProfile = typeof userTasteProfiles.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type AcquisitionRequest = typeof acquisitionRequests.$inferSelect;
export type UserMediaState = typeof userMediaStates.$inferSelect;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
