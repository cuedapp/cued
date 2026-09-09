"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, CircleAlert, CircleX, Inbox, RefreshCw, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Link } from "@/i18n/navigation";
import { parseJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";
import { useActiveJobLabels } from "./use-active-job-labels";
import { Button } from "./ui/button";

type Notification = { id: string; category: string; message: string; href?: string | null; createdAt: string };
export function NotificationPeek({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("InAppNotifications");
  const locale = useLocale();
  const activeJobLabels = useActiveJobLabels();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function clear(action: "read" | "clear") {
    const response = await fetch("/api/notifications", { method: action === "read" ? "POST" : "DELETE" });
    if (response.ok) setNotifications([]);
  }

  useEffect(() => {
    if (!open) return;
    void fetch("/api/notifications?scope=recent", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as { notifications: Notification[] }) : undefined))
      .then((result) => setNotifications(result?.notifications ?? []));
  }, [open]);

  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)} aria-label={t("title")}>
        <Bell className="size-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">{unreadCount}</span>}
      </Button>
      <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable className="notification-peek-overlay fixed inset-0 z-100 bg-black/50 backdrop-blur-sm">
        <Modal className="notification-peek-panel ml-auto h-dvh overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl outline-none">
          <Dialog aria-label={t("title")} className="flex h-full flex-col outline-none">
            <div className="border-b border-border p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Inbox className="size-5 text-primary" /><h2 className="font-display text-xl font-semibold">{t("title")}</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("close")}><X className="size-5" /></Button></div>
              {notifications.length > 0 && <div className="mt-4 flex items-center gap-3"><button type="button" onClick={() => void clear("read")} className="text-sm font-medium text-primary hover:underline">{t("markAllRead")}</button><button type="button" onClick={() => void clear("clear")} className="text-sm font-medium text-destructive hover:underline">{t("clear")}</button></div>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{notifications.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p> : <div className="divide-y divide-border">{notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} locale={locale} activeJobLabels={activeJobLabels} />)}</div>}</div>
            <div className="border-t border-border p-4"><Button asChild variant="outline" className="w-full"><Link href="/notifications" onClick={() => setOpen(false)}>{t("viewAll")}</Link></Button></div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

function NotificationRow({ notification, locale, activeJobLabels }: { notification: Notification; locale: string; activeJobLabels: Set<string> }) {
  const t = useTranslations("InAppNotifications");
  const failed = notification.category.endsWith("failed");
  const started = notification.category.endsWith("started");
  const rejected = notification.category === "request.rejected";
  const removed = notification.category === "request.removed";
  const active = started && activeJobLabels.has(notification.category.split(".")[0]);
  const Icon = failed ? CircleAlert : rejected ? CircleX : removed ? Trash2 : started ? RefreshCw : CheckCircle2;
  const counts = notification.category === "jellyfin.completed" ? parseJellyfinSyncNotification(notification.message) : undefined;
  const text = notification.category.startsWith("request.") ? t(`events.${notification.category}.message`, { title: notification.message }) : notification.category === "jellyfin.completed" && !counts ? t("events.jellyfin.completed.messageFallback") : t(`events.${notification.category}.message`, counts);
  const content = <article className="flex gap-3 px-5 py-3 hover:bg-muted/50"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${failed || rejected ? "bg-destructive/10 text-destructive" : started ? "bg-primary/10 text-primary" : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"}`}><Icon className={`size-4 ${active ? "animate-spin" : ""}`} /></span><div className="min-w-0"><div className="text-sm font-semibold">{t(`events.${notification.category}.title`)}</div><p className="mt-1 text-sm text-muted-foreground">{text}</p><time className="mt-1 block text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</time></div></article>;
  return notification.href ? <Link href={notification.href as never}>{content}</Link> : content;
}
