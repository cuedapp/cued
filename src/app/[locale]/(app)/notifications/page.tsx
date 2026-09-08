import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeDateTime } from "@/lib/date-time";
import { parseJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";
import { inAppNotificationService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { clearNotifications } from "./actions";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [t, locale, notifications] = await Promise.all([
    getTranslations("InAppNotifications"),
    getLocale(),
    inAppNotificationService.list(user.id),
  ]);
  await inAppNotificationService.markAllRead(user.id);
  return (
    <div className="space-y-8">
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
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const failed = notification.category.endsWith("failed");
            const started = notification.category.endsWith("started");
            const counts =
              notification.category === "jellyfin.completed"
                ? parseJellyfinSyncNotification(notification.message)
                : undefined;
            const Icon = failed ? CircleAlert : started ? RefreshCw : CheckCircle2;
            return (
              <Card key={notification.id} className={!notification.readAt ? "border-primary/30" : undefined}>
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                    <Icon
                      className={`size-5 ${failed ? "text-destructive" : started ? "text-primary" : "text-emerald-600"}`}
                    />
                  </span>
                  <div>
                    <div className="font-medium">{t(`events.${notification.category}.title`)}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`events.${notification.category}.message`, counts)}
                    </p>
                    <time
                      className="mt-2 block text-xs text-muted-foreground"
                      dateTime={notification.createdAt.toISOString()}
                    >
                      {formatRelativeDateTime(
                        notification.createdAt,
                        new Date(),
                        locale,
                        user.dateFormat,
                        user.timeFormat,
                      )}
                    </time>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
