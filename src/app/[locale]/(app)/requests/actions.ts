"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { acquisitionService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";

export interface ReviewRequestState {
  result?: "approved" | "rejected" | "reapproved";
  error?: "failed";
}
export async function reviewAcquisitionRequest(_: ReviewRequestState, formData: FormData): Promise<ReviewRequestState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({
      id: z.string().uuid(),
      locale: z.string().refine(isLocale),
      decision: z.enum(["approved", "rejected", "reapproved"]),
      rootFolderPath: z.string().optional(),
      qualityProfileId: z.coerce.number().int().positive().optional(),
      title: z.string().max(500).optional(),
    })
    .safeParse({
      id: formData.get("id"),
      locale: formData.get("locale"),
      decision: formData.get("decision"),
      rootFolderPath: formData.get("rootFolderPath") || undefined,
      qualityProfileId: formData.get("qualityProfileId") || undefined,
      title: formData.get("title") || undefined,
    });
  if (!input.success) return { error: "failed" };
  try {
    if (input.data.decision === "approved" || input.data.decision === "reapproved") {
      if (!input.data.rootFolderPath || !input.data.qualityProfileId) return { error: "failed" };
      const approve =
        input.data.decision === "approved"
          ? acquisitionService.approve.bind(acquisitionService)
          : acquisitionService.approveRejected.bind(acquisitionService);
      await approve(
        input.data.id,
        user.id,
        {
          rootFolderPath: input.data.rootFolderPath,
          qualityProfileId: input.data.qualityProfileId,
        },
        input.data.title,
      );
    } else await acquisitionService.reject(input.data.id, user.id, input.data.title);
    revalidatePath(`/${input.data.locale}/requests`);
    return { result: input.data.decision };
  } catch {
    return { error: "failed" };
  }
}
