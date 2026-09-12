"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { userDirectoryService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { contentRatingAges } from "@/lib/content-rating";

export interface UserManagementState {
  result?: "access-saved" | "order-saved" | "content-rating-saved" | "ai-policy-saved" | "policies-saved";
  error?: "failed";
}

export async function updateUserPolicies(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const rawMaximumAge = String(formData.get("maximumAge") ?? "");
  const input = z
    .object({
      userId: z.string().uuid(),
      locale: z.string().refine(isLocale),
      maximumAge: z.union([
        z.literal(""),
        z.string().refine((value) => contentRatingAges.includes(Number(value) as never)),
      ]),
      aiChatEnabled: z.boolean(),
      aiChatDailyLimit: z.number().int().min(1).max(100),
      requestsRequireApproval: z.boolean(),
    })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      maximumAge: rawMaximumAge,
      aiChatEnabled: formData.get("aiChatEnabled") === "on",
      aiChatDailyLimit: Number(formData.get("aiChatDailyLimit")),
      requestsRequireApproval: formData.get("requestsRequireApproval") === "on",
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.setPolicies(input.data.userId, {
      maximumContentRatingAge: input.data.maximumAge === "" ? null : Number(input.data.maximumAge),
      aiChatEnabled: input.data.aiChatEnabled,
      aiChatDailyLimit: input.data.aiChatDailyLimit,
      requestsRequireApproval: input.data.requestsRequireApproval,
    });
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/library`);
    return { result: "policies-saved" };
  } catch {
    return { error: "failed" };
  }
}

export async function updateUserAccess(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({ userId: z.string().uuid(), locale: z.string().refine(isLocale), accessEnabled: z.boolean() })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      accessEnabled: formData.get("accessEnabled") === "true",
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.setAccessEnabled(admin.id, input.data.userId, input.data.accessEnabled);
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/statistics`);
    return { result: "access-saved" };
  } catch {
    return { error: "failed" };
  }
}

export async function reorderUsers(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  let userIds: unknown = [];
  try {
    userIds = JSON.parse(String(formData.get("userIds") ?? "[]"));
  } catch {
    return { error: "failed" };
  }
  const input = z
    .object({
      locale: z.string().refine(isLocale),
      userIds: z.array(z.string().uuid()),
    })
    .safeParse({
      locale: formData.get("locale"),
      userIds,
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.reorderUsers(input.data.userIds);
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/statistics`);
    return { result: "order-saved" };
  } catch {
    return { error: "failed" };
  }
}
