import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";

export default async function ProfileRedirectPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) return null;
  redirect(`/${locale}/profile/${user.id}`);
}
