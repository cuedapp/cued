import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { inAppNotificationService } from "@/server/application/services";
import { clearNotifications } from "./actions";
import { formatRelativeDateTime } from "@/lib/date-time";

export default async function NotificationsPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const [t, locale, notifications] = await Promise.all([getTranslations("InAppNotifications"), getLocale(), inAppNotificationService.list(user.id)]);
  await inAppNotificationService.markAllRead(user.id);
  return <div className="space-y-8"><header className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{t("description")}</p></div>{notifications.length > 0 && <form action={clearNotifications}><Button type="submit" variant="outline">{t("clear")}</Button></form>}</header>{notifications.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">{t("empty")}</CardContent></Card> : <div className="space-y-3">{notifications.map((notification) => { const failed = notification.category.endsWith("failed"); const started = notification.category.endsWith("started"); const Icon = failed ? CircleAlert : started ? RefreshCw : CheckCircle2; return <Card key={notification.id} className={!notification.readAt ? "border-primary/30" : undefined}><CardContent className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted"><Icon className={`size-5 ${failed ? "text-destructive" : started ? "text-primary" : "text-emerald-600"}`} /></span><div><div className="font-medium">{t(`events.${notification.category}.title`)}</div><p className="mt-1 text-sm text-muted-foreground">{t(`events.${notification.category}.message`)}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.createdAt.toISOString()}>{formatRelativeDateTime(notification.createdAt, new Date(), locale, user.dateFormat, user.timeFormat)}</time></div></CardContent></Card>; })}</div>}</div>;
}
