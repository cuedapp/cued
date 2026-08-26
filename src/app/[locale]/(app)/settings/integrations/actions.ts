"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, mediaSyncService } from "@/server/application/services";

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
      await jellyfinIntegrationService.testConnection();
      return { result: "connected" };
    }
    await jellyfinIntegrationService.configure({ baseUrl: result.data.baseUrl, apiKey: result.data.apiKey || undefined });
    revalidatePath(`/${result.data.locale}/settings/integrations`);
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
  const mode = z.enum(["full", "updates"]).safeParse(formData.get("mode"));
  if (!mode.success) return { error: "failed" };
  try {
    const counts = await mediaSyncService.sync("manual", user.id, mode.data);
    revalidatePath("/");
    return { result: { libraries: counts.librariesProcessed, items: counts.itemsProcessed, users: counts.usersProcessed, mode: counts.mode } };
  } catch {
    return { error: "failed" };
  }
}
