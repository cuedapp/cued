import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, CircleDashed, Film, Tv, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeDateTime } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { ReviewActions } from "./review-actions";
import { PageIntro } from "@/components/page-intro";
import { RequestHistory, type HistoricRequest } from "./request-history";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Requests");
  const [pending, history, strmImports, radarr, sonarr] = await Promise.all([
    acquisitionService.getPending(),
    acquisitionService.getHistory(),
    m3uEditorIntegrationService.getStrmJellyfinImports(),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
  ]);
  const [radarrOptions, sonarrOptions] = await Promise.all([
    radarr.configured
      ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
      : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
    sonarr.configured
      ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
      : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
  ]);
  const items = await Promise.all(
    pending.map(async (row) => ({
      ...row,
      title: await tmdbMetadataService
        .getTitle(user.id, row.request.mediaType as "movie" | "series", row.request.tmdbId, locale)
        .catch(() => undefined),
    })),
  );
  const historicItems: HistoricRequest[] = await Promise.all(
    history.map(async ({ request, username, avatarTag, reviewerName }) => {
      const title = await tmdbMetadataService
        .getTitle(user.id, request.mediaType as "movie" | "series", request.tmdbId, locale)
        .catch(() => undefined);
      const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions;
      return {
        id: request.id,
        mediaType: request.mediaType as "movie" | "series",
        tmdbId: request.tmdbId,
        title: title?.title ?? t("unknown", { id: request.tmdbId }),
        username,
        userId: request.userId,
        avatarTag,
        reviewerName,
        status: request.status as "approved" | "rejected" | "failed",
        rootFolderPath: request.rootFolderPath,
        qualityProfile:
          options.qualityProfiles.find((profile) => profile.id === request.qualityProfileId)?.name ??
          (request.qualityProfileId ? `#${request.qualityProfileId}` : null),
        reviewedAt: request.reviewedAt
          ? formatRelativeDateTime(request.reviewedAt, new Date(), locale, user.dateFormat, user.timeFormat)
          : "—",
        error: request.error,
      };
    }),
  );
  const strmItems = (
    await Promise.all(
      strmImports.map(async (request) => {
        const parsed = /^strm-jellyfin-import:(movie|series):(\d+)$/.exec(request.jobName);
        if (!parsed) return undefined;
        const mediaType = parsed[1] as "movie" | "series";
        const tmdbId = Number(parsed[2]);
        const title = await tmdbMetadataService.getTitle(user.id, mediaType, tmdbId, locale).catch(() => undefined);
        return {
          ...request,
          mediaType,
          tmdbId,
          title: title?.title ?? t("unknown", { id: tmdbId }),
        };
      }),
    )
  ).filter((request): request is NonNullable<typeof request> => Boolean(request));
  return (
    <div className="space-y-10">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t("pendingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("pendingIntro")}</p>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(({ request, username, avatarTag, title }) => {
              const Icon = request.mediaType === "movie" ? Film : Tv;
              const overview = request.mediaType === "movie" ? radarr : sonarr;
              const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions;
              return (
                <article
                  key={request.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-end"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/title/${request.mediaType}/${request.tmdbId}` as never}
                        className="font-display text-lg font-semibold hover:text-primary"
                      >
                        {title?.title ?? t("unknown", { id: request.tmdbId })}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <UserAvatar userId={request.userId} name={username} avatarTag={avatarTag} className="size-6" />
                        {t("requestedBy", { user: username })}
                      </div>
                    </div>
                  </div>
                  <ReviewActions
                    id={request.id}
                    locale={locale}
                    rootFolders={options.rootFolders}
                    qualityProfiles={options.qualityProfiles}
                    defaultRootFolderPath={overview.rootFolderPath}
                    defaultProfileId={overview.qualityProfileId}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t("strmTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("strmIntro")}</p>
        </div>
        {strmItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t("strmEmpty")}
          </div>
        ) : (
          <div className="space-y-3">
            {strmItems.map((request) => {
              const Icon = request.mediaType === "movie" ? Film : Tv;
              const pendingImport = request.status === "pending";
              const failedImport = request.status === "failed";
              const StatusIcon = pendingImport ? CircleDashed : failedImport ? TriangleAlert : CheckCircle2;
              const statusLabel = pendingImport
                ? t("strmStatuses.pending")
                : failedImport
                  ? t("strmStatuses.failed")
                  : t("strmStatuses.completed");
              return (
                <article key={request.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/title/${request.mediaType}/${request.tmdbId}` as never}
                          className="font-display text-lg font-semibold hover:text-primary"
                        >
                          {request.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{t("strmSource")}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${pendingImport ? "bg-primary/10 text-primary" : failedImport ? "bg-destructive/10 text-destructive" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"}`}
                    >
                      <StatusIcon className={`size-3.5 ${pendingImport ? "animate-spin" : ""}`} />
                      {statusLabel}
                    </span>
                  </div>
                  {request.error && (
                    <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {request.error}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <RequestHistory items={historicItems} />
    </div>
  );
}
