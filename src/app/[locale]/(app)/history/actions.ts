"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { tasteService } from "@/server/application/services";

const feedbackSchema = z.object({
  mediaItemId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  feedback: z.string().trim().max(1_000).optional(),
  tags: z.array(z.enum(["fun", "noBrainerAction", "comfortWatch", "greatCharacters", "smart", "moving", "suspenseful", "feelGood", "exciting", "rewatchable", "tooSlow", "tooLong", "tooDark", "boring", "notForMe"])).max(6),
  excluded: z.coerce.boolean().default(false),
});

export async function saveMediaFeedback(_: { error?: string }, formData: FormData) {
  const parsed = feedbackSchema.safeParse({
    mediaItemId: formData.get("mediaItemId"),
    rating: formData.get("rating") || undefined,
    feedback: formData.get("feedback") || undefined,
    tags: formData.getAll("tags"),
    excluded: formData.get("excluded") === "on",
  });
  if (!parsed.success) return { error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };
  try {
    await tasteService.saveFeedback(user.id, parsed.data.mediaItemId, parsed.data);
    revalidatePath("/history", "page");
    revalidatePath("/", "page");
    return {};
  } catch {
    return { error: "failed" };
  }
}

export async function completeTasteOnboarding(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const status = formData.get("status") === "skipped" ? "skipped" : "completed";
  await tasteService.completeOnboarding(user.id, status);
  revalidatePath("/", "page");
  revalidatePath("/onboarding", "page");
}
