"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { aiIntegrationService, inAppNotificationService, jellyfinIntegrationService, m3uEditorIntegrationService, mediaSyncService, radarrIntegrationService, sonarrIntegrationService, tmdbIntegrationService } from "@/server/application/services";
import { logger } from "@/lib/logger";

export interface IntegrationFormState { result?: "saved" | "connected"; error?: "invalid" | "unreachable" | "encryption" }

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
}

const configurationSchema = z.object({
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  intent: z.enum(["save", "test"]),
});

export async function updateJellyfinConfiguration(_: IntegrationFormState, formData: FormData): Promise<IntegrationFormState> {
  await requireAdmin();
  const result = configurationSchema.safeParse({ locale: formData.get("locale"), baseUrl: formData.get("baseUrl"), apiKey: formData.get("apiKey"), intent: formData.get("intent") });
  if (!result.success) return { error: "invalid" };
  try {
    if (result.data.intent === "test") {
      await jellyfinIntegrationService.testConfiguration({ baseUrl: result.data.baseUrl, apiKey: result.data.apiKey || undefined });
      return { result: "connected" };
    }
    await jellyfinIntegrationService.configure({ baseUrl: result.data.baseUrl, apiKey: result.data.apiKey || undefined });
    revalidatePath(`/${result.data.locale}/settings/integrations`);
    revalidatePath(`/${result.data.locale}/settings/integrations/jellyfin`);
    return { result: "saved" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" };
    return { error: "unreachable" };
  }
}

const librariesSchema = z.object({ locale: z.string().refine(isLocale), selected: z.array(z.string()) });
export interface LibraryFormState { result?: "saved"; error?: "failed" }

export async function updateSelectedLibraries(_: LibraryFormState, formData: FormData): Promise<LibraryFormState> {
  await requireAdmin();
  const result = librariesSchema.safeParse({ locale: formData.get("locale"), selected: formData.getAll("selected") });
  if (!result.success) return { error: "failed" };
  try {
    await jellyfinIntegrationService.selectLibraries(result.data.selected);
    revalidatePath(`/${result.data.locale}/settings/integrations`);
    revalidatePath(`/${result.data.locale}/settings/integrations/jellyfin`);
    return { result: "saved" };
  } catch {
    return { error: "failed" };
  }
}

export interface SyncFormState { result?: { libraries: number; items: number; users: number; mode: "full" | "updates" }; error?: "unavailable" | "failed" }

export async function runManualSync(_: SyncFormState, formData: FormData): Promise<SyncFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
  if (!mediaSyncService) return { error: "unavailable" };
  const input = z.object({ mode: z.enum(["full", "updates"]), locale: z.string().refine(isLocale) }).safeParse({ mode: formData.get("mode"), locale: formData.get("locale") });
  if (!input.success) return { error: "failed" };
  await inAppNotificationService.notifyUser(user.id, "jellyfin.started", "/settings/integrations/jellyfin");
  try {
    const counts = await mediaSyncService.sync("manual", user.id, input.data.mode);
    revalidatePath(`/${input.data.locale}`);
    revalidatePath(`/${input.data.locale}/settings/integrations`);
    revalidatePath(`/${input.data.locale}/settings/integrations/jellyfin`);
    await inAppNotificationService.notifyUser(user.id, "jellyfin.completed", "/settings/integrations/jellyfin");
    return { result: { libraries: counts.librariesProcessed, items: counts.itemsProcessed, users: counts.usersProcessed, mode: counts.mode } };
  } catch {
    await inAppNotificationService.notifyUser(user.id, "jellyfin.failed", "/settings/integrations/jellyfin");
    return { error: "failed" };
  }
}

export interface ScheduleFormState { result?: "saved"; error?: "failed" }
const scheduleSchema = z.object({ provider: z.enum(["jellyfin", "m3u-editor"]), locale: z.string().refine(isLocale), minutes: z.coerce.number().refine((value) => [0, 15, 30, 60, 360, 720, 1440].includes(value)) });
export async function updateSyncSchedule(_: ScheduleFormState, formData: FormData): Promise<ScheduleFormState> {
  await requireAdmin();
  const parsed = scheduleSchema.safeParse({ provider: formData.get("provider"), locale: formData.get("locale"), minutes: formData.get("minutes") });
  if (!parsed.success) return { error: "failed" };
  try { const service = parsed.data.provider === "jellyfin" ? jellyfinIntegrationService : m3uEditorIntegrationService; await service.setSyncInterval(parsed.data.minutes); revalidatePath(`/${parsed.data.locale}/settings/integrations/${parsed.data.provider}`); return { result: "saved" }; } catch { return { error: "failed" }; }
}

export interface TmdbFormState { result?: "saved" | "connected"; error?: "invalid" | "unreachable" | "encryption" }

const tmdbConfigurationSchema = z.object({
  locale: z.string().refine(isLocale),
  accessToken: z.string().optional(),
  intent: z.enum(["save", "test"]),
});

export async function updateTmdbConfiguration(_: TmdbFormState, formData: FormData): Promise<TmdbFormState> {
  await requireAdmin();
  const result = tmdbConfigurationSchema.safeParse({ locale: formData.get("locale"), accessToken: formData.get("accessToken"), intent: formData.get("intent") });
  if (!result.success) return { error: "invalid" };
  try {
    if (result.data.intent === "test") {
      await tmdbIntegrationService.testConfiguration(result.data.accessToken || undefined);
      return { result: "connected" };
    }
    await tmdbIntegrationService.configure(result.data.accessToken || undefined);
    revalidatePath(`/${result.data.locale}/settings/integrations`);
    revalidatePath(`/${result.data.locale}/settings/integrations/tmdb`);
    return { result: "saved" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" };
    if (error instanceof Error && error.message.includes("required")) return { error: "invalid" };
    return { error: "unreachable" };
  }
}

export interface OpenAiFormState { result?: "saved" | "connected"; error?: "invalid" | "unreachable" | "encryption" }
const openAiConfigurationSchema = z.object({ locale: z.string().refine(isLocale), apiKey: z.string().optional(), model: z.string().trim().min(1).max(100), mode: z.enum(["off", "conservative", "balanced", "enhanced"]), intent: z.enum(["save", "test"]) });

export async function updateOpenAiConfiguration(_: OpenAiFormState, formData: FormData): Promise<OpenAiFormState> {
  await requireAdmin();
  const result = openAiConfigurationSchema.safeParse({ locale: formData.get("locale"), apiKey: formData.get("apiKey"), model: formData.get("model"), mode: formData.get("mode"), intent: formData.get("intent") });
  if (!result.success) return { error: "invalid" };
  try {
    if (result.data.intent === "test") {
      await aiIntegrationService.testConfiguration({ apiKey: result.data.apiKey || undefined, model: result.data.model });
      return { result: "connected" };
    }
    await aiIntegrationService.configure({ apiKey: result.data.apiKey || undefined, mode: result.data.mode, model: result.data.model });
    revalidatePath(`/${result.data.locale}/settings/integrations`);
    revalidatePath(`/${result.data.locale}/settings/integrations/openai`);
    return { result: "saved" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" };
    if (error instanceof Error && error.message.includes("required")) return { error: "invalid" };
    return { error: "unreachable" };
  }
}

export interface ArrFormState { result?: "saved" | "connected"; error?: "invalid" | "unreachable" | "encryption"; options?: { rootFolders: Array<{ id: number; path: string }>; qualityProfiles: Array<{ id: number; name: string }>; tags: Array<{ id: number; label: string }> } }
const arrConfigurationSchema = z.object({ provider: z.enum(["radarr", "sonarr"]), locale: z.string().refine(isLocale), baseUrl: z.string().url(), apiKey: z.string().optional(), rootFolderPath: z.string().optional(), qualityProfileId: z.coerce.number().int().positive().optional(), tagIds: z.array(z.coerce.number().int().positive()), searchOnAdd: z.boolean(), seriesMonitor: z.enum(["all", "future", "missing", "existing", "firstSeason", "lastSeason", "none"]), intent: z.enum(["save", "test"]) });

export async function updateArrConfiguration(_: ArrFormState, formData: FormData): Promise<ArrFormState> {
  await requireAdmin();
  const result = arrConfigurationSchema.safeParse({ provider: formData.get("provider"), locale: formData.get("locale"), baseUrl: formData.get("baseUrl"), apiKey: formData.get("apiKey"), rootFolderPath: formData.get("rootFolderPath") || undefined, qualityProfileId: formData.get("qualityProfileId") || undefined, tagIds: formData.getAll("tagIds"), searchOnAdd: formData.get("searchOnAdd") === "on", seriesMonitor: formData.get("seriesMonitor") || "all", intent: formData.get("intent") });
  if (!result.success) return { error: "invalid" };
  const service = result.data.provider === "radarr" ? radarrIntegrationService : sonarrIntegrationService;
  try {
    if (result.data.intent === "test") {
      const tested = await service.testConfiguration({ baseUrl: result.data.baseUrl, apiKey: result.data.apiKey || undefined });
      return { result: "connected", options: { rootFolders: tested.rootFolders, qualityProfiles: tested.qualityProfiles, tags: tested.tags } };
    }
    await service.configure({ baseUrl: result.data.baseUrl, apiKey: result.data.apiKey || undefined, rootFolderPath: result.data.rootFolderPath, qualityProfileId: result.data.qualityProfileId, tagIds: result.data.tagIds, searchOnAdd: result.data.searchOnAdd, seriesMonitor: result.data.seriesMonitor });
    revalidatePath(`/${result.data.locale}/settings/integrations`);
    revalidatePath(`/${result.data.locale}/settings/integrations/${result.data.provider}`);
    return { result: "saved" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" };
    if (error instanceof Error && error.message.includes("required")) return { error: "invalid" };
    return { error: "unreachable" };
  }
}

export interface M3uEditorFormState { result?: "saved" | "connected" | "synced"; error?: "invalid" | "unreachable" | "encryption"; playlists?: Array<{ uuid: string; name: string }> }
const relativeDirectory = z.string().trim().min(1).regex(/^(?![./]|.*(?:^|\/)\.\.(?:\/|$))[^\\:*?"<>|]+(?:\/[^\\:*?"<>|]+)*$/);
const m3uEditorSchema = z.object({ locale: z.string().refine(isLocale), baseUrl: z.string().url(), username: z.string().trim().min(1), playbackUsername: z.string().trim().min(1), password: z.string().optional(), apiToken: z.string().optional(), playlistUuid: z.string().uuid().optional(), movieDirectory: relativeDirectory, seriesDirectory: relativeDirectory, movieLibraryIds: z.array(z.string().uuid()), seriesLibraryIds: z.array(z.string().uuid()), refreshPlaylist: z.boolean(), refreshJellyfin: z.boolean(), intent: z.enum(["save", "test"]) });
export async function updateM3uEditorConfiguration(_: M3uEditorFormState, formData: FormData): Promise<M3uEditorFormState> {
  await requireAdmin(); const parsed = m3uEditorSchema.safeParse({ locale: formData.get("locale"), baseUrl: formData.get("baseUrl"), username: formData.get("username"), playbackUsername: formData.get("playbackUsername"), password: formData.get("password"), apiToken: formData.get("apiToken"), playlistUuid: formData.get("playlistUuid") || undefined, movieDirectory: formData.get("movieDirectory"), seriesDirectory: formData.get("seriesDirectory"), movieLibraryIds: formData.getAll("movieLibraryIds"), seriesLibraryIds: formData.getAll("seriesLibraryIds"), refreshPlaylist: formData.get("refreshPlaylist") === "on", refreshJellyfin: formData.get("refreshJellyfin") === "on", intent: formData.get("intent") }); if (!parsed.success) return { error: "invalid" };
  try { if (parsed.data.intent === "test") { const playlists = await m3uEditorIntegrationService.testConfiguration({ baseUrl: parsed.data.baseUrl, username: parsed.data.username, password: parsed.data.password || undefined, apiToken: parsed.data.apiToken || undefined }); return { result: "connected", playlists }; } if (!parsed.data.playlistUuid) return { error: "invalid" }; await m3uEditorIntegrationService.configure({ ...parsed.data, playlistUuid: parsed.data.playlistUuid, password: parsed.data.password || undefined, apiToken: parsed.data.apiToken || undefined }); revalidatePath(`/${parsed.data.locale}/settings/integrations`); revalidatePath(`/${parsed.data.locale}/settings/integrations/m3u-editor`); return { result: "saved" }; } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; logger.error("M3U Editor configuration failed", { stage: parsed.data.intent, error: message.slice(0, 1_000) }); if (message.includes("Encryption")) return { error: "encryption" }; if (message.includes("required") || message.includes("unavailable")) return { error: "invalid" }; return { error: "unreachable" }; }
}
const m3uSyncSchema = z.object({ locale: z.string().refine(isLocale) });
export async function syncM3uEditor(_: M3uEditorFormState, formData: FormData): Promise<M3uEditorFormState> { const user = await getCurrentUser(); if (!user || user.role !== "admin") throw new Error("Administrator access required"); const parsed = m3uSyncSchema.safeParse({ locale: formData.get("locale") }); if (!parsed.success) return { error: "invalid" }; await inAppNotificationService.notifyUser(user.id, "m3u.started", "/settings/integrations/m3u-editor"); try { await m3uEditorIntegrationService.refresh(); await inAppNotificationService.notifyUser(user.id, "m3u.completed", "/settings/integrations/m3u-editor"); revalidatePath(`/${parsed.data.locale}`, "layout"); revalidatePath(`/${parsed.data.locale}/settings/integrations/m3u-editor`); return { result: "synced" }; } catch { await inAppNotificationService.notifyUser(user.id, "m3u.failed", "/settings/integrations/m3u-editor"); return { error: "unreachable" }; } }
