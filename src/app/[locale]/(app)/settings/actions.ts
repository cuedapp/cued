"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { notificationService, userPreferencesService } from "@/server/application/services";

const preferencesSchema = z.object({
  dateFormat: z.enum(["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"]),
  timeFormat: z.enum(["24h", "12h"]),
});

export async function updateDisplayPreferences(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = preferencesSchema.safeParse({ dateFormat: formData.get("dateFormat"), timeFormat: formData.get("timeFormat") });
  if (!parsed.success) return;
  await userPreferencesService.updateDisplayPreferences(user.id, parsed.data);
  revalidatePath("/settings", "page");
  revalidatePath("/history", "page");
}

const notificationSchema = z.object({ baseUrl: z.string().url(), token: z.string().optional(), topic: z.string().trim().max(256), strongRecommendations: z.boolean(), followedRequestable: z.boolean(), newSeasons: z.boolean(), persistentFailures: z.boolean(), minimumMatch: z.coerce.number().int().min(50).max(100), failureThreshold: z.coerce.number().int().min(1).max(20), intent: z.enum(["save", "test"]) }).refine((value) => value.intent !== "test" || value.topic.length > 0);

export interface NotificationFormState { result?: "saved" | "connected"; error?: "invalid" | "unreachable" | "encryption" }
export async function updateNotificationPreferences(_: NotificationFormState, formData: FormData): Promise<NotificationFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "invalid" };
  const parsed = notificationSchema.safeParse({ baseUrl: formData.get("baseUrl"), token: formData.get("token"), topic: formData.get("topic"), strongRecommendations: formData.get("strongRecommendations") === "on", followedRequestable: formData.get("followedRequestable") === "on", newSeasons: formData.get("newSeasons") === "on", persistentFailures: formData.get("persistentFailures") === "on", minimumMatch: formData.get("minimumMatch"), failureThreshold: formData.get("failureThreshold"), intent: formData.get("intent") });
  if (!parsed.success) return { error: "invalid" };
  try {
    if (parsed.data.intent === "test") { await notificationService.testConfiguration(user.id, { baseUrl: parsed.data.baseUrl, token: parsed.data.token || undefined, topic: parsed.data.topic }); return { result: "connected" }; }
    await notificationService.savePreferences(user.id, { ...parsed.data, token: parsed.data.token || undefined });
    revalidatePath("/settings", "page"); return { result: "saved" };
  } catch (error) { if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" }; return { error: "unreachable" }; }
}
