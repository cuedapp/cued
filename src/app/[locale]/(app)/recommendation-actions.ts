"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";

const feedbackSchema = z.object({
  recommendationId: z.string().uuid().optional(),
  mediaType: z.enum(["movie", "series"]).optional(),
  tmdbId: z.coerce.number().int().positive().optional(),
  feedback: z.enum(["moreLikeThis", "notInterested", "restore"]),
}).refine((value) => Boolean(value.recommendationId) || Boolean(value.mediaType && value.tmdbId), { message: "A recommendation or title is required" });

export async function updateRecommendationFeedback(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = feedbackSchema.safeParse({ recommendationId: formData.get("recommendationId"), mediaType: formData.get("mediaType"), tmdbId: formData.get("tmdbId"), feedback: formData.get("feedback") });
  if (!user || !parsed.success) return { error: "failed" as const };
  try {
    const feedback = parsed.data.feedback === "restore" ? null : parsed.data.feedback;
    if (parsed.data.recommendationId) await recommendationService.setFeedback(user.id, parsed.data.recommendationId, feedback);
    else if (parsed.data.mediaType && parsed.data.tmdbId) await recommendationService.setTitleFeedback(user.id, parsed.data.mediaType, parsed.data.tmdbId, await getLocale(), feedback);
    await recommendationService.invalidate(user.id);
    revalidatePath("/", "layout");
    return { feedback };
  } catch {
    return { error: "failed" as const };
  }
}
