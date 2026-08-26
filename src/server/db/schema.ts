import { boolean, index, integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const integrationStatus = pgEnum("integration_status", ["unconfigured", "healthy", "degraded"]);
export const syncStatus = pgEnum("sync_status", ["running", "completed", "failed"]);
export const syncTrigger = pgEnum("sync_trigger", ["manual", "login", "scheduled"]);
export const mediaKind = pgEnum("media_kind", ["movie", "series", "season", "episode"]);

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
  serverId: text("server_id"),
  serverName: text("server_name"),
  serverVersion: text("server_version"),
  status: integrationStatus("status").notNull().default("unconfigured"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastError: text("last_error"),
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
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_integration_jellyfin_user_idx").on(table.integrationId, table.jellyfinUserId)]);

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

export type User = typeof users.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type MetadataCacheEntry = typeof metadataCacheEntries.$inferSelect;
export type UserSearch = typeof userSearches.$inferSelect;
export type UserMediaState = typeof userMediaStates.$inferSelect;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
