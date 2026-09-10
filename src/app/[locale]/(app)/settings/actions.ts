"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { notificationService, operationalService, userPreferencesService } from "@/server/application/services";

const preferencesSchema = z.object({
  dateFormat: z.enum(["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"]),
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

const inAppNotificationSchema = z.object({
  recommendationUpdates: z.boolean(),
  requestUpdates: z.boolean(),
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
