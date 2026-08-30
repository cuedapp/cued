import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { acquisitionRequests, followEvents, follows, integrations, integrationSyncRuns, jobRuns, mediaItems, mediaLibraries, notificationDeliveries, notificationPreferences, recommendationRefreshStates, recommendations, userLibraryAccess, userMediaFeedback, userMediaStates, users, userTasteProfiles } from "@/server/db/schema";
import { backupVersion, userExportSchema, type UserExport } from "./backup-format";
export { userExportSchema } from "./backup-format";

function date(value: Date | null) { return value?.toISOString() ?? null; }
function json<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export class BackupService {
  async exportUser(userId: string): Promise<UserExport> {
    const [user] = await db.select({ dateFormat: users.dateFormat, timeFormat: users.timeFormat, locale: users.locale }).from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const feedback = await db.select({ mediaType: mediaItems.kind, tmdbId: mediaItems.tmdbId, rating: userMediaFeedback.rating, feedback: userMediaFeedback.feedback, tags: userMediaFeedback.tags, excluded: userMediaFeedback.excluded }).from(userMediaFeedback).innerJoin(mediaItems, eq(userMediaFeedback.mediaItemId, mediaItems.id)).where(eq(userMediaFeedback.userId, userId));
    const userFollows = await db.select().from(follows).where(eq(follows.userId, userId));
    const [taste] = await db.select().from(userTasteProfiles).where(eq(userTasteProfiles.userId, userId));
    return {
      format: "cued-user-export", version: backupVersion, exportedAt: new Date().toISOString(), preferences: { dateFormat: user.dateFormat as "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy", timeFormat: user.timeFormat as "24h" | "12h", locale: user.locale as "en" | "sv" | "nl" },
      tasteProfile: taste ? { onboardingStatus: taste.onboardingStatus, sourceMediaCount: taste.sourceMediaCount, profile: json(taste.profile), generatedAt: date(taste.generatedAt), completedAt: date(taste.completedAt) } : null,
      feedback: feedback.flatMap((entry) => entry.tmdbId !== null && (entry.mediaType === "movie" || entry.mediaType === "series" || entry.mediaType === "season") ? [{ mediaType: entry.mediaType, tmdbId: entry.tmdbId, rating: entry.rating, feedback: entry.feedback, tags: entry.tags, excluded: entry.excluded }] : []),
      follows: userFollows.map((follow) => ({ targetType: follow.targetType as "movie" | "series" | "person", tmdbId: follow.tmdbId, locale: follow.locale, title: follow.title, imagePath: follow.imagePath, releaseDate: follow.releaseDate, snapshot: json(follow.snapshot), requestState: follow.requestState, createdAt: follow.createdAt.toISOString() })),
    };
  }

  async importUser(userId: string, input: unknown) {
    const archive = userExportSchema.parse(input);
    let importedFeedback = 0;
    let skippedFeedback = 0;
    await db.transaction(async (tx) => {
      await tx.update(users).set({ ...archive.preferences, updatedAt: new Date() }).where(eq(users.id, userId));
      if (archive.tasteProfile) await tx.insert(userTasteProfiles).values({ userId, onboardingStatus: archive.tasteProfile.onboardingStatus, sourceMediaCount: archive.tasteProfile.sourceMediaCount, profile: archive.tasteProfile.profile, generatedAt: archive.tasteProfile.generatedAt ? new Date(archive.tasteProfile.generatedAt) : null, completedAt: archive.tasteProfile.completedAt ? new Date(archive.tasteProfile.completedAt) : null, updatedAt: new Date() }).onConflictDoUpdate({ target: userTasteProfiles.userId, set: { onboardingStatus: archive.tasteProfile.onboardingStatus, sourceMediaCount: archive.tasteProfile.sourceMediaCount, profile: archive.tasteProfile.profile, generatedAt: archive.tasteProfile.generatedAt ? new Date(archive.tasteProfile.generatedAt) : null, completedAt: archive.tasteProfile.completedAt ? new Date(archive.tasteProfile.completedAt) : null, updatedAt: new Date() } });
      for (const item of archive.feedback) {
        const [media] = await tx.select({ id: mediaItems.id }).from(mediaItems).where(and(eq(mediaItems.kind, item.mediaType), eq(mediaItems.tmdbId, item.tmdbId)));
        if (!media) { skippedFeedback++; continue; }
        await tx.insert(userMediaFeedback).values({ userId, mediaItemId: media.id, rating: item.rating, feedback: item.feedback, tags: item.tags, excluded: item.excluded, updatedAt: new Date() }).onConflictDoUpdate({ target: [userMediaFeedback.userId, userMediaFeedback.mediaItemId], set: { rating: item.rating, feedback: item.feedback, tags: item.tags, excluded: item.excluded, updatedAt: new Date() } });
        importedFeedback++;
      }
      for (const follow of archive.follows) await tx.insert(follows).values({ userId, targetType: follow.targetType, tmdbId: follow.tmdbId, locale: follow.locale, title: follow.title, imagePath: follow.imagePath, releaseDate: follow.releaseDate, snapshot: follow.snapshot, requestState: follow.requestState, createdAt: new Date(follow.createdAt), updatedAt: new Date(), lastCheckedAt: null }).onConflictDoUpdate({ target: [follows.userId, follows.targetType, follows.tmdbId], set: { locale: follow.locale, title: follow.title, imagePath: follow.imagePath, releaseDate: follow.releaseDate, snapshot: follow.snapshot, requestState: follow.requestState, updatedAt: new Date() } });
    });
    return { importedFeedback, skippedFeedback, importedFollows: archive.follows.length };
  }

  async exportFull() {
    const [integrationsData, usersData, notificationPreferencesData, notificationDeliveriesData, librariesData, accessData, mediaData, feedbackData, tasteData, recommendationsData, refreshStatesData, mediaStatesData, syncRunsData, requestsData, followsData, eventsData, jobsData] = await Promise.all([db.select().from(integrations), db.select().from(users), db.select().from(notificationPreferences), db.select().from(notificationDeliveries), db.select().from(mediaLibraries), db.select().from(userLibraryAccess), db.select().from(mediaItems), db.select().from(userMediaFeedback), db.select().from(userTasteProfiles), db.select().from(recommendations), db.select().from(recommendationRefreshStates), db.select().from(userMediaStates), db.select().from(integrationSyncRuns), db.select().from(acquisitionRequests), db.select().from(follows), db.select().from(followEvents), db.select().from(jobRuns)]);
    return { format: "cued-full-backup", version: backupVersion, exportedAt: new Date().toISOString(), data: json({ integrations: integrationsData, users: usersData, notificationPreferences: notificationPreferencesData, notificationDeliveries: notificationDeliveriesData, mediaLibraries: librariesData, userLibraryAccess: accessData, mediaItems: mediaData, userMediaFeedback: feedbackData, userTasteProfiles: tasteData, recommendations: recommendationsData, recommendationRefreshStates: refreshStatesData, userMediaStates: mediaStatesData, integrationSyncRuns: syncRunsData, acquisitionRequests: requestsData, follows: followsData, followEvents: eventsData, jobRuns: jobsData }) };
  }

  async restoreFull(input: unknown) {
    const parsed = z.object({ format: z.literal("cued-full-backup"), version: z.literal(backupVersion), exportedAt: z.string().datetime({ offset: true }), data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))) }).parse(input);
    const data = reviveDates(parsed.data) as Record<string, Array<Record<string, unknown>>>;
    const rows = (name: string) => data[name] ?? [];
    const batches = (name: string) => chunk(rows(name), 250);
    await db.transaction(async (tx) => {
      await tx.execute("TRUNCATE TABLE job_runs, follow_events, follows, acquisition_requests, integration_sync_runs, user_media_states, recommendation_refresh_states, recommendations, user_taste_profiles, user_media_feedback, user_library_access, media_items, media_libraries, notification_deliveries, notification_preferences, sessions, user_searches, external_media_availability, metadata_cache_entries, recommendation_runs, users, integrations RESTART IDENTITY CASCADE");
      for (const batch of batches("integrations")) await tx.insert(integrations).values(batch as never);
      for (const batch of batches("users")) await tx.insert(users).values(batch as never);
      for (const batch of batches("notificationPreferences")) await tx.insert(notificationPreferences).values(batch as never);
      for (const batch of batches("notificationDeliveries")) await tx.insert(notificationDeliveries).values(batch as never);
      for (const batch of batches("mediaLibraries")) await tx.insert(mediaLibraries).values(batch as never);
      for (const batch of batches("userLibraryAccess")) await tx.insert(userLibraryAccess).values(batch as never);
      for (const batch of batches("mediaItems")) await tx.insert(mediaItems).values(batch as never);
      for (const batch of batches("userMediaFeedback")) await tx.insert(userMediaFeedback).values(batch as never);
      for (const batch of batches("userTasteProfiles")) await tx.insert(userTasteProfiles).values(batch as never);
      for (const batch of batches("recommendations")) await tx.insert(recommendations).values(batch as never);
      for (const batch of batches("recommendationRefreshStates")) await tx.insert(recommendationRefreshStates).values(batch as never);
      for (const batch of batches("userMediaStates")) await tx.insert(userMediaStates).values(batch as never);
      for (const batch of batches("integrationSyncRuns")) await tx.insert(integrationSyncRuns).values(batch as never);
      for (const batch of batches("acquisitionRequests")) await tx.insert(acquisitionRequests).values(batch as never);
      for (const batch of batches("follows")) await tx.insert(follows).values(batch as never);
      for (const batch of batches("followEvents")) await tx.insert(followEvents).values(batch as never);
      for (const batch of batches("jobRuns")) await tx.insert(jobRuns).values(batch as never);
    });
  }
}

function chunk<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

function reviveDates(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return new Date(value);
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)]));
  return value;
}
