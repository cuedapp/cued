"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

export function NotificationListRefresh() {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const checkForUpdates = async () => {
      if (refreshing.current) return;
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const value = (await response.json()) as { notifications: Array<{ id: string }> };
      if (value.notifications.length === 0 || cancelled) return;
      refreshing.current = true;
      router.refresh();
    };
    const interval = window.setInterval(() => void checkForUpdates(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
