"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleX, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { parseJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";
import { notificationMessageValues } from "@/lib/in-app-notification-message";
import { formatDisplayDateTime } from "@/lib/date-time";
import { useAppStatus } from "@/components/app-status-provider";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreList } from "@/components/load-more-list";

type Notification = {
  id: string;
  category: string;
  message: string;
  details: Record<string, string> | null;
  href: string | null;
  createdAt: string;
};
type Filter = "all" | "requests" | "sync" | "following" | "integrations" | "system";
const filters: Filter[] = ["all", "requests", "sync", "following", "integrations", "system"];

function categoryFilter(category: string): Exclude<Filter, "all"> {
  if (category.startsWith("request.")) return "requests";
  if (
    category.startsWith("jellyfin.") ||
    category.startsWith("m3u.") ||
    category.startsWith("ratings.") ||
    category.startsWith("strm.")
  )
    return "sync";
  if (category.startsWith("follow.")) return "following";
  if (category.startsWith("integration.")) return "integrations";
  return "system";
}

export function NotificationBrowser({
  notifications,
  dateFormat,
  timeFormat,
}: {
  notifications: Notification[];
  dateFormat: string;
  timeFormat: string;
}) {
  const t = useTranslations("InAppNotifications");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const { status } = useAppStatus();
  const activeJobLabels = new Set((status?.jobs ?? []).map((job) => job.label));
  const visible = useMemo(
    () => notifications.filter((item) => filter === "all" || categoryFilter(item.category) === filter),
    [filter, notifications],
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("filtersLabel")}>
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {t(`filters.${value}`)}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <LoadMoreList
          key={filter}
          initialCount={20}
          showMoreLabel={t("showMore")}
          showingTemplate={t("showingProgress", { shown: "{shown}", total: "{total}" })}
          placement="library"
          className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
        >
          {visible.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              locale={locale}
              dateFormat={dateFormat}
              timeFormat={timeFormat}
              activeJobLabels={activeJobLabels}
            />
          ))}
        </LoadMoreList>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  locale,
  dateFormat,
  timeFormat,
  activeJobLabels,
}: {
  notification: Notification;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  activeJobLabels: Set<string>;
}) {
  const t = useTranslations("InAppNotifications");
  const failed = notification.category.endsWith("failed");
  const started = notification.category.endsWith("started");
  const rejected = notification.category === "request.rejected";
  const removed = notification.category === "request.removed";
  const counts =
    notification.category === "jellyfin.completed" ? parseJellyfinSyncNotification(notification.message) : undefined;
  const Icon = failed ? CircleAlert : rejected ? CircleX : removed ? Trash2 : started ? RefreshCw : CheckCircle2;
  const messageValues = notificationMessageValues(
    notification.category,
    notification.message,
    notification.details,
    t("events.follow.new_credit.someone"),
  );
  const message = messageValues
    ? t(`events.${notification.category}.message`, messageValues)
    : notification.category === "jellyfin.completed" && !counts
      ? t("events.jellyfin.completed.messageFallback")
      : t(`events.${notification.category}.message`, counts);
  const active = started && activeJobLabels.has(notification.category.split(".")[0]);
  const content = (
    <article className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${failed || rejected ? "bg-destructive/10 text-destructive" : started ? "bg-primary/10 text-primary" : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"}`}
      >
        <Icon className={`size-4 ${active ? "animate-spin" : ""}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold">{t(`events.${notification.category}.title`)}</h2>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatDisplayDateTime(new Date(notification.createdAt), locale, dateFormat, timeFormat)}
          </time>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </article>
  );
  return notification.href ? (
    <Link href={notification.href as never} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
