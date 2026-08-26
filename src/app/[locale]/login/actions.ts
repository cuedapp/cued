"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { isLocale } from "@/i18n/config";
import { authService } from "@/server/application/services";
import { sessionCookieName } from "@/server/application/auth.service";
import { JellyfinRequestError } from "@/server/integrations/jellyfin/client";

export interface LoginFormState { error?: "invalid" | "credentials" | "unavailable" }

const loginSchema = z.object({ locale: z.string().refine(isLocale), username: z.string().trim().min(1), password: z.string() });

export async function login(_: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const result = loginSchema.safeParse({ locale: formData.get("locale"), username: formData.get("username"), password: formData.get("password") });
  if (!result.success) return { error: "invalid" };
  if (!authService) return { error: "unavailable" };
  let authenticated: Awaited<ReturnType<typeof authService.login>>;
  try {
    authenticated = await authService.login(result.data.username, result.data.password);
  } catch (error) {
    if (error instanceof JellyfinRequestError && error.status === 401) return { error: "credentials" };
    return { error: "unavailable" };
  }
  (await cookies()).set(sessionCookieName, authenticated.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: authenticated.expiresAt,
  });
  redirect(`/${result.data.locale}`);
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  await authService?.logout(token);
  cookieStore.delete(sessionCookieName);
}
