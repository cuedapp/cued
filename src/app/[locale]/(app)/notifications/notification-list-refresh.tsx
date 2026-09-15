"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAppStatus } from "@/components/app-status-provider";

export function NotificationListRefresh() {
  const router = useRouter();
  const { status } = useAppStatus();
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    const ids = status?.notifications.map((notification) => notification.id);
    if (!ids) return;
    const hasNewNotification = initialized.current && ids.some((id) => !seen.current.has(id));
    seen.current = new Set(ids);
    initialized.current = true;
    if (hasNewNotification) router.refresh();
  }, [router, status?.notifications]);

  return null;
}
