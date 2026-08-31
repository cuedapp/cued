import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Film, Tv } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeDateTime } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, radarrIntegrationService, sonarrIntegrationService, tmdbMetadataService } from "@/server/application/services";
import { ReviewActions } from "./review-actions";
import { RequestHistory, type HistoricRequest } from "./request-history";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Requests");
  const [pending, history, radarr, sonarr] = await Promise.all([acquisitionService.getPending(), acquisitionService.getHistory(), radarrIntegrationService.getOverview(), sonarrIntegrationService.getOverview()]);
  const [radarrOptions, sonarrOptions] = await Promise.all([
    radarr.configured ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
    sonarr.configured ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
  ]);
  const items = await Promise.all(pending.map(async (row) => ({ ...row, title: await tmdbMetadataService.getTitle(user.id, row.request.mediaType as "movie" | "series", row.request.tmdbId, locale).catch(() => undefined) })));
  const historicItems: HistoricRequest[] = await Promise.all(history.map(async ({ request, username, avatarTag, reviewerName }) => {
    const title = await tmdbMetadataService.getTitle(user.id, request.mediaType as "movie" | "series", request.tmdbId, locale).catch(() => undefined);
    const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions;
    return { id: request.id, mediaType: request.mediaType as "movie" | "series", tmdbId: request.tmdbId, title: title?.title ?? t("unknown", { id: request.tmdbId }), username, userId: request.userId, avatarTag, reviewerName, status: request.status as "approved" | "rejected" | "failed", rootFolderPath: request.rootFolderPath, qualityProfile: options.qualityProfiles.find((profile) => profile.id === request.qualityProfileId)?.name ?? (request.qualityProfileId ? `#${request.qualityProfileId}` : null), reviewedAt: request.reviewedAt ? formatRelativeDateTime(request.reviewedAt, new Date(), locale, user.dateFormat, user.timeFormat) : "—", error: request.error };
  }));
  return <div className="space-y-10"><header className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p></header><section className="space-y-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">{t("pendingTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("pendingIntro")}</p></div>{items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("empty")}</div> : <div className="space-y-4">{items.map(({ request, username, avatarTag, title }) => { const Icon = request.mediaType === "movie" ? Film : Tv; const overview = request.mediaType === "movie" ? radarr : sonarr; const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions; return <article key={request.id} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><div className="min-w-0"><Link href={`/title/${request.mediaType}/${request.tmdbId}` as never} className="font-display text-xl font-semibold hover:text-primary">{title?.title ?? t("unknown", { id: request.tmdbId })}</Link><div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><UserAvatar userId={request.userId} name={username} avatarTag={avatarTag} className="size-6" />{t("requestedBy", { user: username })}</div></div></div><ReviewActions id={request.id} locale={locale} rootFolders={options.rootFolders} qualityProfiles={options.qualityProfiles} defaultRootFolderPath={overview.rootFolderPath} defaultProfileId={overview.qualityProfileId} /></article>; })}</div>}</section><RequestHistory items={historicItems} /></div>;
}
