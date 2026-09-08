import { getLocale, getTranslations } from "next-intl/server";
import { BellRing, CalendarDays, RefreshCw, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { MediaPoster } from "@/components/media-poster";
import { MediaCard } from "@/components/media-card";
import { RequestButton } from "@/components/request-button";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatRelativeDateTime } from "@/lib/date-time";
import { followService, radarrIntegrationService, sonarrIntegrationService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { refreshFollows } from "./actions";
import { FollowingFilters } from "./following-filters";
import { PageIntro } from "@/components/page-intro";

type FollowingParams = { query?: string; type?: string; sort?: string };

export default async function FollowingPage({ searchParams }: { searchParams: Promise<FollowingParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const t = await getTranslations("Following");
  const params = await searchParams;
  const type = member(params.type, ["all", "movie", "series"] as const, "all");
  const sort = member(params.sort, ["added", "release", "title"] as const, "added");
  const query = (params.query ?? "").trim().slice(0, 100);
  const [follows, events, radarr, sonarr] = await Promise.all([
    followService.list(user.id),
    followService.listEvents(user.id),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
  ]);
  const allowOptions = user.role === "admin" || !user.requestsRequireApproval;
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
  const includesQuery = (title: string) => title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const allTitleFollows = follows.filter((follow) => follow.targetType === "movie" || follow.targetType === "series");
  const titleFollows = allTitleFollows
    .filter((follow) => type === "all" || follow.targetType === type)
    .filter((follow) => includesQuery(follow.title))
    .toSorted((left, right) => {
      if (sort === "release")
        return (
          (left.releaseDate ?? "9999-12-31").localeCompare(right.releaseDate ?? "9999-12-31") ||
          right.createdAt.getTime() - left.createdAt.getTime()
        );
      if (sort === "title") return left.title.localeCompare(right.title);
      return right.createdAt.getTime() - left.createdAt.getTime();
    });
  const allPeople = follows.filter((follow) => follow.targetType === "person");
  const people = allPeople.filter((follow) => includesQuery(follow.title));
  const allCollections = follows.filter((follow) => follow.targetType === "collection");
  const collections = allCollections.filter((follow) => includesQuery(follow.title));
  const upcoming = titleFollows
    .filter((follow) => follow.releaseDate && follow.releaseDate >= new Date().toISOString().slice(0, 10))
    .toSorted((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

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

      <FollowingFilters
        values={{ query, type, sort }}
        labels={{
          title: t("filters"),
          help: t("filtersHelp"),
          search: t("search"),
          searchPlaceholder: t("searchPlaceholder"),
          type: t("type"),
          allTypes: t("allTypes"),
          movie: t("types.movie"),
          series: t("types.series"),
          sort: t("sort"),
          recentlyFollowed: t("sortOptions.added"),
          upcomingRelease: t("sortOptions.release"),
          titleSort: t("sortOptions.title"),
          apply: t("apply"),
          clear: t("clear"),
        }}
      />

      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="font-display text-3xl font-semibold">{t("upcoming")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((follow) => (
              <Link
                key={follow.id}
                href={`/title/${follow.targetType}/${follow.tmdbId}` as never}
                className="flex min-w-0 items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40"
              >
                <MediaPoster
                  path={follow.imagePath ?? undefined}
                  alt={follow.title}
                  className="w-16 shrink-0 rounded-lg"
                />
                <div>
                  <div className="font-semibold">{follow.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatDisplayDate(new Date(`${follow.releaseDate}T12:00:00Z`), user.dateFormat)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-semibold">{t("titles")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("showingTitles", { shown: titleFollows.length, total: allTitleFollows.length })}
          </p>
        </div>
        {titleFollows.length === 0 ? (
          <Empty text={t("noTitles")} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {titleFollows.map((follow) => {
              const type = follow.targetType as "movie" | "series";
              const overview = type === "movie" ? radarr : sonarr;
              const options = type === "movie" ? radarrOptions : sonarrOptions;
              const state =
                follow.requestState === "available"
                  ? "available"
                  : follow.requestState === "pending"
                    ? "pending"
                    : follow.requestState === "existing"
                      ? "existing"
                      : "idle";
              const canRequest = overview.configured;
              return (
                <MediaCard
                  key={follow.id}
                  href={`/title/${type}/${follow.tmdbId}`}
                  posterPath={follow.imagePath}
                  title={follow.title}
                  meta={follow.releaseDate?.slice(0, 4) ?? t(`types.${type}`)}
                  footer={
                    <div className={`grid ${canRequest ? "grid-cols-2" : "grid-cols-1"}`}>
                      <FollowButton targetType={type} tmdbId={follow.tmdbId} initialFollowing iconOnly />
                      {canRequest && (
                        <div className="border-l border-border/60">
                          <RequestButton
                            type={type}
                            tmdbId={follow.tmdbId}
                            compact
                            iconOnly
                            actionCell
                            tooltip={t("request")}
                            allowOptions={allowOptions}
                            options={{
                              rootFolders: options.rootFolders,
                              profiles: options.qualityProfiles,
                              defaultRootFolderPath: overview.rootFolderPath,
                              defaultProfileId: overview.qualityProfileId,
                            }}
                            initialState={state}
                          />
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-semibold">{t("collections")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("showingCollections", { shown: collections.length, total: allCollections.length })}
          </p>
        </div>
        {collections.length === 0 ? (
          <Empty text={t("noCollections")} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
            {collections.map((follow) => (
              <MediaCard
                key={follow.id}
                href={`/collections/${follow.tmdbId}`}
                posterPath={follow.imagePath}
                title={follow.title}
                footer={<FollowButton targetType="collection" tmdbId={follow.tmdbId} initialFollowing iconOnly />}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-semibold">{t("people")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("showingPeople", { shown: people.length, total: allPeople.length })}
          </p>
        </div>
        {people.length === 0 ? (
          <Empty text={t("noPeople")} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
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
          </div>
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

function member<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  fallback: T[number],
): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
      {text}
    </div>
  );
}
