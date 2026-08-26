import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Film } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { tmdbIntegrationService } from "@/server/application/services";
import { TmdbIntegrationForm } from "../tmdb-integration-form";

export default async function TmdbIntegrationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const tmdbT = await getTranslations("TmdbIntegration");
  const tmdb = await tmdbIntegrationService.getOverview();

  return <div className="space-y-8">
    <header className="max-w-2xl"><Link href="/settings/integrations" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("allIntegrations")}</Link><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{tmdbT("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{tmdbT("help")}</p></header>
    <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
      <Card><CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Film className="size-5" /></div><CardTitle>{t("configuration")}</CardTitle><CardDescription>{tmdbT("configurationHelp")}</CardDescription></CardHeader><CardContent><TmdbIntegrationForm locale={locale} encryptionConfigured={tmdb.encryptionConfigured} hasAccessToken={tmdb.hasAccessToken} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{tmdbT("status")}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex items-center gap-3">{tmdb.status === "healthy" ? <CheckCircle2 className="size-5 text-emerald-600" /> : <CircleAlert className="size-5 text-muted-foreground" />}<div><div className="font-medium">{tmdb.configured ? tmdbT("connected") : tmdbT("notConnected")}</div><div className="text-sm text-muted-foreground">{tmdb.configured ? tmdbT("connectedHelp") : tmdbT("notConnectedHelp")}</div></div></div>
        <div className="rounded-xl bg-muted/60 p-4 text-sm"><span className="text-muted-foreground">{tmdbT("tokenStatus")}</span><span className="ml-2 font-medium">{tmdb.hasAccessToken ? tmdbT("configured") : tmdbT("missing")}</span></div>
        {tmdb.lastError && <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"><div className="font-medium">{tmdbT("lastError")}</div><div className="mt-1">{tmdb.lastError}</div></div>}
      </CardContent></Card>
    </div>
  </div>;
}
