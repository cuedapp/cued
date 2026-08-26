import "server-only";
import { cookies } from "next/headers";
import { authService } from "@/server/application/services";
import { sessionCookieName } from "@/server/application/auth.service";
import { authRepository } from "@/server/db/repositories/auth.repository";

export async function getCurrentSession() {
  if (!authService) return undefined;
  const token = (await cookies()).get(sessionCookieName)?.value;
  return authService.getSession(token);
}

export async function getCurrentUser() {
  return (await getCurrentSession())?.user;
}

export async function hasLocalUsers() {
  return authRepository.hasUsers();
}
