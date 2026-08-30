import { ArchiveRestore, Bell, Clock3, HardDriveDownload, Info, Languages, Palette, Plug, RefreshCw, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePicker } from "@/components/theme-picker";
import { LanguagePicker } from "@/components/language-picker";
import { getCurrentUser } from "@/server/auth/session";
import { clearMetadataCaches, updateDisplayPreferences } from "./actions";
import { notificationService, operationalService, releaseService } from "@/server/application/services";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { BackupControls } from "./backup-controls";
import { appVersion } from "@/server/application/app-version";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  const backupT = await getTranslations("Backup");
  const licenseT = await getTranslations("License");
  const user = await getCurrentUser();
  const notifications = user ? await notificationService.getPreferences(user.id) : null;
  const [release, operations] = await Promise.all([releaseService.getStatus(), user?.role === "admin" ? operationalService.overview() : Promise.resolve(null)]);
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        {user?.role === "admin" && <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plug className="size-5" /></div><CardTitle>{t("integrations")}</CardTitle><CardDescription>{t("integrationsHelp")}</CardDescription></CardHeader>
          <CardContent><Button asChild><Link href="/settings/integrations">{t("manageIntegrations")}</Link></Button></CardContent>
        </Card>}
        {user?.role === "admin" && <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="size-5" /></div><CardTitle>{t("users")}</CardTitle><CardDescription>{t("usersHelp")}</CardDescription></CardHeader>
          <CardContent><Button asChild><Link href="/settings/users">{t("manageUsers")}</Link></Button></CardContent>
        </Card>}
        <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="size-5" /></div><CardTitle>{t("appearance")}</CardTitle><CardDescription>{t("appearanceHelp")}</CardDescription></CardHeader>
          <CardContent><ThemePicker /></CardContent>
        </Card>
        <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="size-5" /></div><CardTitle>{t("dateTime")}</CardTitle><CardDescription>{t("dateTimeHelp")}</CardDescription></CardHeader>
          <CardContent><form action={updateDisplayPreferences} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">{t("dateFormat")}<select name="dateFormat" defaultValue={user?.dateFormat ?? "yyyy-mm-dd"} className="h-10 cursor-pointer rounded-lg border border-border bg-background px-3"><option value="yyyy-mm-dd">YYYY-MM-DD</option><option value="dd-mm-yyyy">DD-MM-YYYY</option><option value="mm-dd-yyyy">MM-DD-YYYY</option></select></label><label className="grid gap-2 text-sm font-medium">{t("timeFormat")}<select name="timeFormat" defaultValue={user?.timeFormat ?? "24h"} className="h-10 cursor-pointer rounded-lg border border-border bg-background px-3"><option value="24h">24 {t("hour")}</option><option value="12h">12 {t("hour")}</option></select></label><Button type="submit" className="cursor-pointer sm:col-span-2 sm:w-fit">{t("saveDisplay")}</Button></form></CardContent>
        </Card>
        <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Languages className="size-5" /></div><CardTitle>{t("language")}</CardTitle><CardDescription>{t("languageHelp")}</CardDescription></CardHeader>
          <CardContent><LanguagePicker /></CardContent>
        </Card>
        {notifications && <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="size-5" /></div><CardTitle>{t("notifications")}</CardTitle><CardDescription>{t("notificationsHelp")}</CardDescription></CardHeader>
          <CardContent><NotificationPreferencesForm preferences={notifications} isAdmin={user?.role === "admin"} /></CardContent>
        </Card>}
        <Card className="lg:col-span-2">
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ArchiveRestore className="size-5" /></div><CardTitle>{backupT("title")}</CardTitle><CardDescription>{backupT("description")}</CardDescription></CardHeader>
          <CardContent><BackupControls isAdmin={user?.role === "admin"} /></CardContent>
        </Card>
        {operations && <Card className="lg:col-span-2">
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><RefreshCw className="size-5" /></div><CardTitle>{t("maintenance")}</CardTitle><CardDescription>{t("maintenanceHelp")}</CardDescription></CardHeader>
          <CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><div className="text-2xl font-semibold">{operations.cacheEntries}</div><div className="text-xs text-muted-foreground">{t("cachedEntries")}</div></div><div className="rounded-xl bg-muted/60 p-4"><div className="text-2xl font-semibold">{operations.integrations.filter((integration) => integration.status === "healthy").length}/{operations.integrations.length}</div><div className="text-xs text-muted-foreground">{t("healthyIntegrations")}</div></div></div><form action={clearMetadataCaches}><Button type="submit" variant="outline">{t("clearCache")}</Button></form>{operations.integrations.some((integration) => integration.status === "degraded") && <p className="text-sm text-destructive">{t("degradedIntegrations")}</p>}</CardContent>
        </Card>}
        <Card className="lg:col-span-2">
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Info className="size-5" /></div><CardTitle>{t("about")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("version")}</div><div className="mt-1 font-medium">{appVersion}</div></div><div className="rounded-xl bg-muted/60 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{licenseT("label")}</div><a href="https://github.com/cuedapp/cued" target="_blank" rel="noreferrer" className="mt-1 inline-block font-medium text-primary hover:underline">{licenseT("name")}</a></div></div>
            {release.updateAvailable && release.latestVersion && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><div className="flex items-start gap-3"><HardDriveDownload className="mt-0.5 size-5 shrink-0 text-primary" /><div><div className="font-medium">{t("updateAvailable", { version: release.latestVersion })}</div><p className="mt-1 text-sm text-muted-foreground">{t("updateAvailableHelp")}</p>{release.releaseUrl && <a href={release.releaseUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">{t("releaseNotes")}</a>}</div></div></div>}
            {release.updateAvailable && release.notes && <details className="rounded-xl border border-border/60 p-4"><summary className="cursor-pointer font-medium">{t("releaseNotes")}</summary><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">{release.notes}</pre></details>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 p-4">
              <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="inline-flex shrink-0 rounded-md outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><Image src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="The Movie Database (TMDB)" width={64} height={46} unoptimized className="h-5 w-auto" /></a>
              <p className="text-xs leading-5 text-muted-foreground">{t("tmdbAttribution")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
