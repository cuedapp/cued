"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { parseJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";

export function NotificationToasts() {
  const t = useTranslations("InAppNotifications");
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const result = (await response.json()) as {
        notifications: Array<{ id: string; category: string; message: string }>;
      };
      for (const item of [...result.notifications].reverse()) {
        if (seen.current.has(item.id)) continue;
        seen.current.add(item.id);
        if (!initialized.current || item.category.startsWith("recommendations.")) continue;
        const counts = item.category === "jellyfin.completed" ? parseJellyfinSyncNotification(item.message) : undefined;
        const title = t(`events.${item.category}.title`);
        const description =
          item.category === "jellyfin.completed" && !counts
            ? t("events.jellyfin.completed.messageFallback")
            : t(`events.${item.category}.message`, counts);
        if (item.category.endsWith("failed")) toast.error(title, { description });
        else if (item.category.endsWith("started"))
          toast.info(title, {
            id: item.category.split(".")[0],
            description,
            duration: Number.POSITIVE_INFINITY,
            dismissible: true,
            closeButton: true,
          });
        else {
          toast.success(title, { id: item.category.split(".")[0], description });
        }
      }
      initialized.current = true;
    };
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [t]);
  return null;
}
