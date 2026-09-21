"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { parseJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";
import { notificationMessageValues } from "@/lib/in-app-notification-message";
import { useAppStatus } from "./app-status-provider";

export function NotificationToasts() {
  const t = useTranslations("InAppNotifications");
  const { status } = useAppStatus();
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  useEffect(() => {
    for (const item of [...(status?.notifications ?? [])].reverse()) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      if (!initialized.current || item.category.startsWith("recommendations.")) continue;
      const counts = item.category === "jellyfin.completed" ? parseJellyfinSyncNotification(item.message) : undefined;
      const title = t(`events.${item.category}.title`);
      const messageValues = notificationMessageValues(
        item.category,
        item.message,
        item.details,
        t("events.follow.new_credit.someone"),
      );
      const description = messageValues
        ? t(`events.${item.category}.message`, messageValues)
        : item.category === "jellyfin.completed" && !counts
          ? t("events.jellyfin.completed.messageFallback")
          : t(`events.${item.category}.message`, counts);
      if (item.category.endsWith("failed")) toast.error(title, { description });
      else if (item.category.endsWith("started"))
        toast.info(title, {
          id: item.category.split(".")[0],
          description,
          dismissible: true,
          closeButton: true,
        });
      else {
        toast.success(title, { id: item.category.split(".")[0], description });
      }
    }
    if (status) initialized.current = true;
  }, [status, t]);
  return null;
}
