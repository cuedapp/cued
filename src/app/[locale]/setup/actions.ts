"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { jellyfinIntegrationService } from "@/server/application/services";
import { getCurrentUser, hasLocalUsers } from "@/server/auth/session";

export interface SetupFormState {
  error?: "invalid" | "unreachable" | "encryption";
}

const setupSchema = z.object({
  locale: z.string().refine(isLocale),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
});

export async function configureJellyfin(_: SetupFormState, formData: FormData): Promise<SetupFormState> {
  const result = setupSchema.safeParse({
    locale: formData.get("locale"),
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
  });
  if (!result.success) return { error: "invalid" };
  const existing = await jellyfinIntegrationService.getOverview();
  if (existing.configured && (await hasLocalUsers())) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new Error("Administrator access required");
  }
  try {
    await jellyfinIntegrationService.configure({
      baseUrl: result.data.baseUrl,
      apiKey: result.data.apiKey || undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Encryption")) return { error: "encryption" };
    return { error: "unreachable" };
  }
  redirect(`/${result.data.locale}/login`);
}
