import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/server/auth/session";
import { inAppNotificationService, jellyfinIntegrationService } from "@/server/application/services";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const integration = await jellyfinIntegrationService.getOverview();
  if (!integration.configured) redirect(`/${locale}/setup`);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const [unreadNotifications, cookieStore] = await Promise.all([
    inAppNotificationService.unreadCount(user.id),
    cookies(),
  ]);
  return (
    <AppShell
      user={{ id: user.id, name: user.displayName, role: user.role, avatarTag: user.primaryImageTag }}
      unreadNotifications={unreadNotifications}
      initialSidebarCollapsed={cookieStore.get("cued.sidebar-collapsed")?.value === "true"}
    >
      {children}
    </AppShell>
  );
}
