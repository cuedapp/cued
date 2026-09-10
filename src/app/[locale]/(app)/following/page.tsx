import { getLocale, getTranslations } from "next-intl/server";
import { BellRing, CalendarDays, EyeOff, RefreshCw, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";
import { MediaCard } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { HorizontalMediaCard } from "@/components/horizontal-media-card";
import { Button } from "@/components/ui/button";
import { RequestButton } from "@/components/request-button";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Link } from "@/i18n/navigation";
import { formatRelativeDate, formatRelativeDateTime } from "@/lib/date-time";
import { mergeUpcomingTitles } from "@/lib/upcoming-titles";
import {
  followService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { hideDerivedUpcoming, refreshFollows } from "./actions";
import { PageIntro } from "@/components/page-intro";
import { EmptyState } from "@/components/empty-state";

export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const t = await getTranslations("Following");
  const titleT = await getTranslations("Title");
  const [follows, events, radarr, sonarr] = await Promise.all([
    followService.list(user.id),
    followService.listEvents(user.id),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
  ]);
  const allowOptions = user.role === "admin" || !user.requestsRequireApproval;
  const titleTargets = follows.flatMap((follow) =>
    follow.targetType === "movie" || follow.targetType === "series"
      ? [{ id: follow.tmdbId, type: follow.targetType as "movie" | "series" }]
      : [],
  );
  const [radarrOptions, sonarrOptions] = allowOptions
    ? await Promise.all([
        radarr.configured
          ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
        sonarr.configured
          ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
      ])
    : [
        { rootFolders: [], qualityProfiles: [], tags: [] },
        { rootFolders: [], qualityProfiles: [], tags: [] },
      ];
  const [libraryAvailability, m3uAvailable, pendingStrmTitles, m3uEditor, accessibleStrmLibraries] = await Promise.all([
    tmdbMetadataService.getLibraryAvailability(user.id, titleTargets),
    tmdbMetadataService.getM3uAvailability(user.id, titleTargets),
    tmdbMetadataService.getPendingStrmTitles(titleTargets),
    m3uEditorIntegrationService.getOverview(),
    m3uEditorIntegrationService.getAccessibleMappedLibraries(user.id),
  ]);
  const strmEnabled =
    m3uEditor.configured &&
    m3uEditor.status === "healthy" &&
    (accessibleStrmLibraries.movie.size > 0 || accessibleStrmLibraries.series.size > 0);
  const titleFollows = follows
    .filter((follow) => follow.targetType === "movie" || follow.targetType === "series")
    .toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const movies = titleFollows.filter((follow) => follow.targetType === "movie");
  const series = titleFollows.filter((follow) => follow.targetType === "series");
  const people = follows.filter((follow) => follow.targetType === "person");
  const collections = follows.filter((follow) => follow.targetType === "collection");
  const today = new Date().toISOString().slice(0, 10);
  const [personMetadata, collectionMetadata] = await Promise.all([
    Promise.all(
      people.map(async (follow) => ({
        follow,
        person: await tmdbMetadataService.getPersonMetadata(follow.tmdbId, locale).catch(() => undefined),
      })),
    ),
    Promise.all(
      collections.map(async (follow) => ({
        follow,
        collection: await tmdbMetadataService.getCollectionMetadata(follow.tmdbId, locale).catch(() => undefined),
      })),
    ),
  ]);
  const upcoming = mergeUpcomingTitles([
    ...titleFollows.flatMap((follow) =>
      follow.releaseDate && follow.releaseDate >= today
        ? [
            {
              id: follow.tmdbId,
              type: follow.targetType as "movie" | "series",
              title: follow.title,
              imagePath: follow.imagePath,
              date: follow.releaseDate,
              sources: [],
              sourceFollowIds: [],
              directlyFollowed: true,
            },
          ]
        : [],
    ),
    ...personMetadata.flatMap(({ follow, person }) =>
      person
        ? person.credits.flatMap((credit) =>
            credit.date &&
            credit.date >= today &&
            !follow.snapshot.hiddenUpcomingKeys?.includes(`${credit.type}:${credit.id}`)
              ? [
                  {
                    id: credit.id,
                    type: credit.type,
                    title: credit.title,
                    imagePath: credit.posterPath,
                    date: credit.date,
                    sources: [t("upcomingFromPerson", { person: follow.title })],
                    sourceFollowIds: [follow.id],
                    directlyFollowed: false,
                  },
                ]
              : [],
          )
        : [],
    ),
    ...collectionMetadata.flatMap(({ follow, collection }) =>
      collection
        ? collection.parts.flatMap((part) =>
            part.date && part.date >= today && !follow.snapshot.hiddenUpcomingKeys?.includes(`${part.type}:${part.id}`)
              ? [
                  {
                    id: part.id,
                    type: part.type,
                    title: part.title,
                    imagePath: part.posterPath,
                    date: part.date,
                    sources: [t("upcomingFromCollection", { collection: follow.title })],
                    sourceFollowIds: [follow.id],
                    directlyFollowed: false,
                  },
                ]
              : [],
          )
        : [],
    ),
  ]);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("intro")}
        action={
          <form action={refreshFollows}>
            <input type="hidden" name="locale" value={locale} />
            <FormSubmitButton pendingLabel={t("refreshing")} variant="outline" className="h-auto min-h-10 px-4 py-2">
              <RefreshCw className="size-4" />
              {t("refresh")}
            </FormSubmitButton>
          </form>
        }
      />

      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="font-display text-3xl font-semibold">{t("upcoming")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((item) => (
              <HorizontalMediaCard
                key={`${item.type}:${item.id}`}
                href={`/title/${item.type}/${item.id}`}
                title={item.title}
                posterPath={item.imagePath ?? undefined}
                className="border-primary/20 bg-primary/5"
                trailing={
                  !item.directlyFollowed && item.sourceFollowIds.length > 0 ? (
                    <form action={hideDerivedUpcoming}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="type" value={item.type} />
                      <input type="hidden" name="tmdbId" value={item.id} />
                      <input type="hidden" name="followIds" value={JSON.stringify(item.sourceFollowIds)} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label={t("hideUpcoming")}
                        title={t("hideUpcoming")}
                      >
                        <EyeOff className="size-4" />
                      </Button>
                    </form>
                  ) : undefined
                }
              >
                <div className="font-semibold">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatRelativeDate(new Date(`${item.date}T12:00:00Z`), new Date(), locale)}
                </div>
                {item.sources.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">{item.sources.join(" · ")}</div>
                )}
              </HorizontalMediaCard>
            ))}
          </div>
        </section>
      )}

      {[
        { title: t("movies"), empty: t("noMovies"), items: movies },
        { title: t("series"), empty: t("noSeries"), items: series },
      ].map((section) => (
        <section key={section.title}>
          <h2 className="font-display text-3xl font-semibold">{section.title}</h2>
          {section.items.length === 0 ? (
            <Empty text={section.empty} />
          ) : (
            <MediaGrid className="mt-5">
              {section.items.map((follow) => {
                const type = follow.targetType as "movie" | "series";
                const key = `${type}:${follow.tmdbId}`;
                const overview = type === "movie" ? radarr : sonarr;
                const options = type === "movie" ? radarrOptions : sonarrOptions;
                const available = libraryAvailability.available.has(key);
                const strmAvailable = strmEnabled && libraryAvailability.strmAvailable.has(key);
                const strmPending = strmEnabled && m3uAvailable.has(key) && pendingStrmTitles.has(key);
                const strmRequestable = strmEnabled && m3uAvailable.has(key);
                const state =
                  follow.requestState === "available"
                    ? "available"
                    : follow.requestState === "pending"
                      ? "pending"
                      : follow.requestState === "existing"
                        ? "existing"
                        : "idle";
                const canRequest = overview.configured;
                const hasRequest = canRequest || strmRequestable;
                return (
                  <MediaCard
                    key={follow.id}
                    href={`/title/${type}/${follow.tmdbId}`}
                    posterPath={follow.imagePath}
                    title={follow.title}
                    meta={follow.releaseDate?.slice(0, 4) ?? t(`types.${type}`)}
                    badges={
                      <MediaCapabilityBadges
                        available={available}
                        strmAvailable={strmAvailable}
                        strmPending={strmPending}
                        strmRequestable={strmRequestable}
                        availableLabel={titleT("available")}
                        strmAvailableLabel={titleT("strmAvailable")}
                        strmPendingLabel={titleT("strmPending")}
                        strmRequestableLabel={titleT("strmRequestable")}
                      />
                    }
                    footer={
                      <div className={`grid ${hasRequest ? "grid-cols-2" : "grid-cols-1"}`}>
                        <FollowButton targetType={type} tmdbId={follow.tmdbId} initialFollowing iconOnly />
                        {hasRequest && (
                          <div className="border-l border-border/60">
                            <RequestButton
                              type={type}
                              tmdbId={follow.tmdbId}
                              compact
                              iconOnly
                              actionCell
                              tooltip={t("request")}
                              allowOptions={allowOptions}
                              arrAvailable={canRequest}
                              strmAvailable={strmRequestable && !available && !strmAvailable && !strmPending}
                              strmAlreadyAvailable={strmAvailable}
                              strmImportPending={strmPending}
                              options={{
                                rootFolders: options.rootFolders,
                                profiles: options.qualityProfiles,
                                defaultRootFolderPath: overview.rootFolderPath,
                                defaultProfileId: overview.qualityProfileId,
                              }}
                              initialState={available ? "available" : state}
                            />
                          </div>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </MediaGrid>
          )}
        </section>
      ))}

      <section>
        <h2 className="font-display text-3xl font-semibold">{t("collections")}</h2>
        {collections.length === 0 ? (
          <Empty text={t("noCollections")} />
        ) : (
          <MediaGrid className="mt-5">
            {collections.map((follow) => (
              <MediaCard
                key={follow.id}
                href={`/collections/${follow.tmdbId}`}
                posterPath={follow.imagePath}
                title={follow.title}
                footer={<FollowButton targetType="collection" tmdbId={follow.tmdbId} initialFollowing iconOnly />}
              />
            ))}
          </MediaGrid>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl font-semibold">{t("people")}</h2>
        {people.length === 0 ? (
          <Empty text={t("noPeople")} />
        ) : (
          <MediaGrid className="mt-5">
            {people.map((follow) => (
              <MediaCard
                key={follow.id}
                href={`/people/${follow.tmdbId}`}
                posterPath={follow.imagePath}
                title={follow.title}
                person
                footer={<FollowButton targetType="person" tmdbId={follow.tmdbId} initialFollowing iconOnly />}
              />
            ))}
          </MediaGrid>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <BellRing className="size-5 text-primary" />
          <h2 className="font-display text-3xl font-semibold">{t("updates")}</h2>
        </div>
        {events.length === 0 ? (
          <Empty text={t("noUpdates")} />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <article key={event.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <div className="font-medium">
                    {t(`events.${event.eventType}`, { title: event.relatedTitle ?? "" })}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeDateTime(event.occurredAt, new Date(), locale, user.dateFormat, user.timeFormat)}
                  </div>
                  {event.relatedType && event.relatedTmdbId && (
                    <Link
                      href={`/title/${event.relatedType}/${event.relatedTmdbId}` as never}
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {t("viewTitle")}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <EmptyState className="mt-4">{text}</EmptyState>;
}
