"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { acquisitionService, userDirectoryService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { contentRatingAges } from "@/lib/content-rating";

export interface UserRequestPolicyState {
  result?: "saved";
  error?: "failed";
}

export interface UserManagementState {
  result?: "access-saved" | "order-saved" | "content-rating-saved" | "ai-policy-saved";
  error?: "failed";
}

export async function updateUserAiPolicy(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({
      userId: z.string().uuid(),
      locale: z.string().refine(isLocale),
      enabled: z.boolean(),
      dailyLimit: z.number().int().min(1).max(100),
    })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      enabled: formData.get("enabled") === "on",
      dailyLimit: Number(formData.get("dailyLimit")),
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.setAiChatPolicy(input.data.userId, input.data.enabled, input.data.dailyLimit);
    revalidatePath(`/${input.data.locale}/settings/users`);
    return { result: "ai-policy-saved" };
  } catch {
    return { error: "failed" };
  }
}

export async function updateUserContentRating(
  _: UserManagementState,
  formData: FormData,
): Promise<UserManagementState> {
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
    })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      maximumAge: rawMaximumAge,
    });
  if (!input.success) return { error: "failed" };
  try {
    const maximumAge = input.data.maximumAge === "" ? null : Number(input.data.maximumAge);
    await userDirectoryService.setContentRatingLimit(input.data.userId, maximumAge);
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/library`);
    return { result: "content-rating-saved" };
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
export async function updateUserRequestPolicy(
  _: UserRequestPolicyState,
  formData: FormData,
): Promise<UserRequestPolicyState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({ userId: z.string().uuid(), locale: z.string().refine(isLocale), requireApproval: z.boolean() })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      requireApproval: formData.get("requireApproval") === "on",
    });
  if (!input.success) return { error: "failed" };
  try {
    await acquisitionService.setUserApprovalPolicy(input.data.userId, input.data.requireApproval);
    revalidatePath(`/${input.data.locale}/settings/users`);
    return { result: "saved" };
  } catch {
    return { error: "failed" };
  }
}
