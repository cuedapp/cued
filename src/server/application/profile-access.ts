import type { User } from "@/server/db/schema";

export function canViewUserProfile(viewer: Pick<User, "id" | "role">, profileUserId: string) {
  return viewer.id === profileUserId || viewer.role === "admin";
}
