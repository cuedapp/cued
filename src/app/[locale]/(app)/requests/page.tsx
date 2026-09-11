import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, CircleDashed, Film, Tv, TriangleAlert } from "lucide-react";
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
import { EmptyState } from "@/components/empty-state";
import { HorizontalMediaCard } from "@/components/horizontal-media-card";
import { RequestHistory, type HistoricRequest } from "./request-history";
import { LoadMoreList } from "@/components/load-more-list";

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
    history.map(async ({ request, username, avatarTag, reviewerName, available }) => {
      const title = await tmdbMetadataService
        .getTitle(user.id, request.mediaType as "movie" | "series", request.tmdbId, locale)
        .catch(() => undefined);
      const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions;
      return {
        id: request.id,
        mediaType: request.mediaType as "movie" | "series",
        tmdbId: request.tmdbId,
        title: title?.title ?? t("unknown", { id: request.tmdbId }),
        posterPath: title?.posterPath,
        username,
        userId: request.userId,
        avatarTag,
        reviewerName,
        status: request.status as "approved" | "rejected" | "failed",
        available,
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
          titleMetadata: title,
        };
      }),
    )
  ).filter((request): request is NonNullable<typeof request> => Boolean(request));
  return (
    <div className="space-y-10">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("pendingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("pendingIntro")}</p>
        </div>
        {items.length === 0 ? (
          <EmptyState>{t("empty")}</EmptyState>
        ) : (
          <LoadMoreList
            className="space-y-4"
            showMoreLabel={t("showMore")}
            showingTemplate={t("showing", { shown: "{shown}", total: "{total}" })}
          >
            {items.map(({ request, username, avatarTag, title }) => {
              const Icon = request.mediaType === "movie" ? Film : Tv;
              const overview = request.mediaType === "movie" ? radarr : sonarr;
              const options = request.mediaType === "movie" ? radarrOptions : sonarrOptions;
              return (
                <HorizontalMediaCard
                  key={request.id}
                  href={`/title/${request.mediaType}/${request.tmdbId}`}
                  title={title?.title ?? t("unknown", { id: request.tmdbId })}
                  posterPath={title?.posterPath ?? undefined}
                  footer={
                    <ReviewActions
                      id={request.id}
                      locale={locale}
                      type={request.mediaType as "movie" | "series"}
                      tmdbId={request.tmdbId}
                      title={title?.title}
                      rootFolders={options.rootFolders}
                      qualityProfiles={options.qualityProfiles}
                      defaultRootFolderPath={overview.rootFolderPath}
                      defaultProfileId={overview.qualityProfileId}
                    />
                  }
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {t(`types.${request.mediaType}`)}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">
                    {title?.title ?? t("unknown", { id: request.tmdbId })}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <UserAvatar userId={request.userId} name={username} avatarTag={avatarTag} className="size-6" />
                    {t("requestedBy", { user: username })}
                  </div>
                </HorizontalMediaCard>
              );
            })}
          </LoadMoreList>
        )}
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("strmTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("strmIntro")}</p>
        </div>
        {strmItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t("strmEmpty")}
          </div>
        ) : (
          <LoadMoreList
            className="space-y-3"
            showMoreLabel={t("showMore")}
            showingTemplate={t("showing", { shown: "{shown}", total: "{total}" })}
          >
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
                <HorizontalMediaCard
                  key={request.id}
                  href={`/title/${request.mediaType}/${request.tmdbId}`}
                  title={request.title}
                  posterPath={request.titleMetadata?.posterPath ?? undefined}
                  trailing={
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${pendingImport ? "bg-primary/10 text-primary" : failedImport ? "bg-destructive/10 text-destructive" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"}`}
                    >
                      <StatusIcon className={`size-3.5 ${pendingImport ? "animate-spin" : ""}`} />
                      {statusLabel}
                    </span>
                  }
                  footer={
                    request.error ? (
                      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{request.error}</p>
                    ) : undefined
                  }
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {t(`types.${request.mediaType}`)} · {t("strmSource")}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{request.title}</div>
                  {request.requesterName ? (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <UserAvatar
                        userId={request.requesterId ?? "unknown"}
                        name={request.requesterName}
                        avatarTag={request.requesterAvatarTag}
                        className="size-6"
                      />
                      {t("requestedBy", { user: request.requesterName })}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{t("requesterUnavailable")}</p>
                  )}
                </HorizontalMediaCard>
              );
            })}
          </LoadMoreList>
        )}
      </section>
      <RequestHistory
        items={historicItems}
        locale={locale}
        reviewOptions={{
          movie: {
            rootFolders: radarrOptions.rootFolders,
            qualityProfiles: radarrOptions.qualityProfiles,
            defaultRootFolderPath: radarr.rootFolderPath,
            defaultProfileId: radarr.qualityProfileId,
          },
          series: {
            rootFolders: sonarrOptions.rootFolders,
            qualityProfiles: sonarrOptions.qualityProfiles,
            defaultRootFolderPath: sonarr.rootFolderPath,
            defaultProfileId: sonarr.qualityProfileId,
          },
        }}
      />
    </div>
  );
}
