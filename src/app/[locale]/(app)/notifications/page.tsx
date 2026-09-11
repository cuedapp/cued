import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { inAppNotificationService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { clearNotifications } from "./actions";
import { NotificationBrowser } from "./notification-browser";
import { NotificationListRefresh } from "./notification-list-refresh";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [t, notifications] = await Promise.all([
    getTranslations("InAppNotifications"),
    inAppNotificationService.list(user.id),
  ]);
  await inAppNotificationService.markAllRead(user.id);
  return (
    <div className="space-y-8">
      <NotificationListRefresh />
      <PageIntro
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          notifications.length > 0 && (
            <form action={clearNotifications}>
              <Button type="submit" variant="outline">
                {t("clear")}
              </Button>
            </form>
          )
        }
      />
      <NotificationBrowser
        notifications={notifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
