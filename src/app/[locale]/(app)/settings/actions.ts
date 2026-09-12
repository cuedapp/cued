"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { isOriginalLanguageCode } from "@/lib/original-languages";
import { getCurrentUser } from "@/server/auth/session";
import {
  notificationService,
  operationalService,
  userPreferencesService,
  visibilityService,
} from "@/server/application/services";

const preferencesSchema = z.object({
  dateFormat: z.enum(["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy", "dd-month-yyyy", "month-dd-yyyy"]),
  timeFormat: z.enum(["24h", "12h"]),
});

export async function updateDisplayPreferences(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = preferencesSchema.safeParse({
    dateFormat: formData.get("dateFormat"),
    timeFormat: formData.get("timeFormat"),
  });
  if (!parsed.success) return;
  await userPreferencesService.updateDisplayPreferences(user.id, parsed.data);
  revalidatePath("/settings", "page");
  revalidatePath("/history", "page");
}

export async function updateLanguage(locale: string) {
  const user = await getCurrentUser();
  if (!user || !isLocale(locale)) return;
  await userPreferencesService.updateLocale(user.id, locale);
}

export async function updatePreferredOriginalLanguages(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const languages = [...new Set(formData.getAll("language").map(String).filter(isOriginalLanguageCode))].slice(0, 8);
  if (languages.length === 0) return;
  await userPreferencesService.updatePreferredOriginalLanguages(user.id, languages);
  revalidatePath("/settings", "page");
  revalidatePath("/explore", "page");
}

const inAppNotificationSchema = z.object({
  recommendationUpdates: z.boolean(),
  requestUpdates: z.boolean(),
  requestAvailabilityUpdates: z.boolean(),
  followingUpdates: z.boolean(),
});

export interface InAppNotificationFormState {
  result?: "saved";
}
export async function updateInAppNotificationPreferences(
  _: InAppNotificationFormState,
  formData: FormData,
): Promise<InAppNotificationFormState> {
  const user = await getCurrentUser();
  if (!user) return {};
  const parsed = inAppNotificationSchema.safeParse({
    recommendationUpdates: formData.get("recommendationUpdates") === "on",
    requestUpdates: formData.get("requestUpdates") === "on",
    requestAvailabilityUpdates: formData.get("requestAvailabilityUpdates") === "on",
    followingUpdates: formData.get("followingUpdates") === "on",
  });
  if (!parsed.success) return {};
  await notificationService.saveInAppPreferences(user.id, parsed.data);
  revalidatePath("/settings", "page");
  return { result: "saved" };
}

export async function clearMetadataCaches() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
  await operationalService.clearCaches();
  revalidatePath("/settings", "page");
}

export interface VisibilitySettingsFormState {
  result?: "saved";
}

export async function updateVisibilitySettings(
  _: VisibilitySettingsFormState,
  formData: FormData,
): Promise<VisibilitySettingsFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
  await visibilityService.saveSettings({
    showServerStatisticsToUsers: formData.get("showServerStatisticsToUsers") === "on",
    showRecentActivityToUsers: formData.get("showRecentActivityToUsers") === "on",
    showWatchingNowToUsers: formData.get("showWatchingNowToUsers") === "on",
  });
  revalidatePath("/settings", "page");
  revalidatePath("/statistics", "page");
  revalidatePath("/", "layout");
  return { result: "saved" };
}
