"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser, hasLocalUsers } from "@/server/auth/session";
import {
  aiIntegrationService,
  jellyfinIntegrationService,
  m3uEditorIntegrationService,
  notificationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbIntegrationService,
} from "@/server/application/services";
import { OpenRouterRequestError } from "@/server/integrations/ai/openrouter-client";

export type WizardError =
  | "invalid"
  | "unreachable"
  | "encryption"
  | "openrouterUnreachable"
  | "openrouterAuthentication"
  | "openrouterCredits"
  | "openrouterPrivacyUnavailable"
  | "openrouterRejected"
  | "openrouterRateLimited";
export interface WizardFormState {
  ok?: true;
  tested?: true;
  error?: WizardError;
  options?: {
    rootFolders: Array<{ id: number; path: string }>;
    qualityProfiles: Array<{ id: number; name: string }>;
    tags: Array<{ id: number; label: string }>;
  };
  playlists?: Array<{ uuid: string; name: string }>;
}

async function requireAdminOrFirstRun() {
  if (!(await hasLocalUsers())) return;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
}

function errorState(error: unknown): WizardFormState {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Encryption")) return { error: "encryption" };
  if (message.includes("required")) return { error: "invalid" };
  return { error: "unreachable" };
}

function refresh(locale: string) {
  revalidatePath(`/${locale}/settings/integrations`);
}

const jellyfinSchema = z.object({
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  externalUrl: z.string().trim().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  intent: z.enum(["save", "test"]),
});
export async function updateJellyfinConfigurationWizard(
  _: WizardFormState,
  formData: FormData,
): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = jellyfinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  try {
    if (parsed.data.intent === "test") {
      await jellyfinIntegrationService.testConfiguration({
        baseUrl: parsed.data.baseUrl,
        apiKey: parsed.data.apiKey || undefined,
      });
      return { tested: true };
    }
    await jellyfinIntegrationService.testConfiguration({
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey || undefined,
    });
    await jellyfinIntegrationService.configure({
      baseUrl: parsed.data.baseUrl,
      externalUrl: parsed.data.externalUrl || undefined,
      apiKey: parsed.data.apiKey || undefined,
    });
    await jellyfinIntegrationService.setSyncInterval(24 * 60);
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}

const tmdbSchema = z.object({
  locale: z.string().refine(isLocale),
  accessToken: z.string().optional(),
  intent: z.enum(["save", "test"]),
});
export async function updateTmdbConfigurationWizard(_: WizardFormState, formData: FormData): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = tmdbSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  try {
    await tmdbIntegrationService.testConfiguration(parsed.data.accessToken || undefined);
    if (parsed.data.intent === "test") return { tested: true };
    await tmdbIntegrationService.configure(parsed.data.accessToken || undefined);
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}
const librariesSchema = z.object({
  locale: z.string().refine(isLocale),
  selected: z.array(z.string()).min(1),
  syncIntervalMinutes: z.coerce.number().int().min(0),
});
export async function updateSelectedLibrariesWizard(_: WizardFormState, formData: FormData): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = librariesSchema.safeParse({
    locale: formData.get("locale"),
    selected: formData.getAll("selected"),
    syncIntervalMinutes: formData.get("syncIntervalMinutes"),
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    await jellyfinIntegrationService.setSyncInterval(parsed.data.syncIntervalMinutes);
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}

const aiSchema = z.object({
  provider: z.enum(["openai", "openrouter"]),
  locale: z.string().refine(isLocale),
  apiKey: z.string().optional(),
  model: z.string().trim().min(1).max(100),
  mode: z.enum(["off", "conservative", "balanced", "enhanced"]),
  refreshDelayMinutes: z.coerce.number().refine((value) => [0, 5, 15, 30].includes(value)),
  intent: z.enum(["save", "test"]),
});
export async function updateAiConfigurationWizard(_: WizardFormState, formData: FormData): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = aiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  try {
    await aiIntegrationService.testConfiguration({
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey || undefined,
      model: parsed.data.model,
    });
    if (parsed.data.intent === "test") return { tested: true };
    await aiIntegrationService.configure({
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey || undefined,
      mode: parsed.data.mode,
      model: parsed.data.model,
      refreshDelayMinutes: parsed.data.refreshDelayMinutes,
    });
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    if (error instanceof OpenRouterRequestError) {
      if (error.status === 401 || error.status === 403) return { error: "openrouterAuthentication" };
      if (error.status === 402) return { error: "openrouterCredits" };
      if (error.status === 429) return { error: "openrouterRateLimited" };
      if (error.status === 0) return { error: "openrouterUnreachable" };
      if (/data policy|zero data retention/i.test(error.message)) return { error: "openrouterPrivacyUnavailable" };
      return { error: "openrouterRejected" };
    }
    return errorState(error);
  }
}

const arrSchema = z.object({
  provider: z.enum(["radarr", "sonarr"]),
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  rootFolderPath: z.string().optional(),
  qualityProfileId: z.coerce.number().int().positive().optional(),
  tagIds: z.array(z.coerce.number().int().positive()),
  searchOnAdd: z.boolean(),
  seriesMonitor: z.enum(["all", "future", "missing", "existing", "firstSeason", "lastSeason", "none"]),
  intent: z.enum(["save", "test"]),
});
export async function updateArrConfigurationWizard(_: WizardFormState, formData: FormData): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = arrSchema.safeParse({
    provider: formData.get("provider"),
    locale: formData.get("locale"),
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
    rootFolderPath: formData.get("rootFolderPath") || undefined,
    qualityProfileId: formData.get("qualityProfileId") || undefined,
    tagIds: formData.getAll("tagIds"),
    searchOnAdd: formData.get("searchOnAdd") === "on",
    seriesMonitor: formData.get("seriesMonitor") || "all",
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { error: "invalid" };
  const service = parsed.data.provider === "radarr" ? radarrIntegrationService : sonarrIntegrationService;
  try {
    const tested = await service.testConfiguration({
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey || undefined,
    });
    if (parsed.data.intent === "test") {
      return {
        tested: true,
        options: { rootFolders: tested.rootFolders, qualityProfiles: tested.qualityProfiles, tags: tested.tags },
      };
    }
    await service.configure({ ...parsed.data, apiKey: parsed.data.apiKey || undefined });
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}

const relativeDirectory = z
  .string()
  .trim()
  .min(1)
  .regex(/^(?![./]|.*(?:^|\/)\.\.(?:\/|$))[^\\:*?"<>|]+(?:\/[^\\:*?"<>|]+)*$/);
const m3uSchema = z.object({
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  username: z.string().trim().min(1),
  playbackUsername: z.string().trim().min(1),
  password: z.string().optional(),
  apiToken: z.string().optional(),
  playlistUuid: z.string().uuid().optional(),
  movieDirectory: relativeDirectory,
  seriesDirectory: relativeDirectory,
  movieLibraryIds: z.array(z.string().uuid()),
  seriesLibraryIds: z.array(z.string().uuid()),
  refreshPlaylist: z.boolean(),
  refreshJellyfin: z.boolean(),
  intent: z.enum(["save", "test"]),
});
export async function updateM3uEditorConfigurationWizard(
  _: WizardFormState,
  formData: FormData,
): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = m3uSchema.safeParse({
    ...Object.fromEntries(formData),
    movieLibraryIds: formData.getAll("movieLibraryIds"),
    seriesLibraryIds: formData.getAll("seriesLibraryIds"),
    refreshPlaylist: formData.get("refreshPlaylist") === "on",
    refreshJellyfin: formData.get("refreshJellyfin") === "on",
    playlistUuid: formData.get("playlistUuid") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    const playlists = await m3uEditorIntegrationService.testConfiguration({
      baseUrl: parsed.data.baseUrl,
      username: parsed.data.username,
      password: parsed.data.password || undefined,
      apiToken: parsed.data.apiToken || undefined,
    });
    if (!parsed.data.playlistUuid) return { tested: true, playlists };
    await m3uEditorIntegrationService.configure({
      ...parsed.data,
      playlistUuid: parsed.data.playlistUuid,
      password: parsed.data.password || undefined,
      apiToken: parsed.data.apiToken || undefined,
    });
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}

const ntfySchema = z.object({
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  token: z.string().optional(),
  topic: z.string().trim().min(1).max(256),
  integrationFailures: z.boolean(),
  jobFailures: z.boolean(),
  failureThreshold: z.coerce.number().int().min(1).max(20),
  updates: z.boolean(),
  intent: z.enum(["save", "test"]),
});
export async function updateNtfyConfigurationWizard(_: WizardFormState, formData: FormData): Promise<WizardFormState> {
  await requireAdminOrFirstRun();
  const parsed = ntfySchema.safeParse({
    ...Object.fromEntries(formData),
    integrationFailures: formData.get("integrationFailures") === "on",
    jobFailures: formData.get("jobFailures") === "on",
    updates: formData.get("updates") === "on",
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    await notificationService.testNtfy(parsed.data);
    if (parsed.data.intent === "test") return { tested: true };
    await notificationService.configureNtfy(parsed.data);
    refresh(parsed.data.locale);
    return { ok: true };
  } catch (error) {
    return errorState(error);
  }
}
