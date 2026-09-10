"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";

const feedbackSchema = z
  .object({
    recommendationId: z.string().uuid().optional(),
    mediaType: z.enum(["movie", "series"]).optional(),
    tmdbId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().min(1).max(400).optional(),
    overview: z.string().max(5_000).optional(),
    feedback: z.enum(["moreLikeThis", "notInterested", "restore"]),
  })
  .refine((value) => Boolean(value.recommendationId) || Boolean(value.mediaType && value.tmdbId), {
    message: "A recommendation or title is required",
  });

export async function updateRecommendationFeedback(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = feedbackSchema.safeParse({
    recommendationId: formString(formData, "recommendationId"),
    mediaType: formString(formData, "mediaType"),
    tmdbId: formString(formData, "tmdbId"),
    title: formString(formData, "title"),
    overview: formString(formData, "overview"),
    feedback: formString(formData, "feedback"),
  });
  if (!user || !parsed.success) return { error: "failed" as const };
  try {
    const feedback = parsed.data.feedback === "restore" ? null : parsed.data.feedback;
    if (parsed.data.recommendationId)
      await recommendationService.setFeedback(user.id, parsed.data.recommendationId, feedback);
    else if (parsed.data.mediaType && parsed.data.tmdbId)
      await recommendationService.setTitleFeedback(
        user.id,
        parsed.data.mediaType,
        parsed.data.tmdbId,
        await getLocale(),
        feedback,
        parsed.data.title
          ? { title: parsed.data.title, overview: parsed.data.overview ?? "", genreIds: [] }
          : undefined,
      );
    return { feedback };
  } catch {
    return { error: "failed" as const };
  }
}

export async function restoreRecommendation(formData: FormData): Promise<void> {
  await updateRecommendationFeedback(formData);
}

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
