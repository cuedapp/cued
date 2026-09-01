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

export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const t = await getTranslations("Following");
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
  const titleFollows = follows.filter((follow) => follow.targetType !== "person");
  const people = follows.filter((follow) => follow.targetType === "person");
  const upcoming = titleFollows
    .filter((follow) => follow.releaseDate && follow.releaseDate >= new Date().toISOString().slice(0, 10))
    .toSorted((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
        </div>
        <form action={refreshFollows}>
          <input type="hidden" name="locale" value={locale} />
          <FormSubmitButton pendingLabel={t("refreshing")} variant="outline">
            <RefreshCw className="size-4" />
            {t("refresh")}
          </FormSubmitButton>
        </form>
      </header>

      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="font-display text-3xl font-semibold">{t("upcoming")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((follow) => (
              <Link
                key={follow.id}
                href={`/title/${follow.targetType}/${follow.tmdbId}` as never}
                className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 hover:border-primary/40"
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
        <h2 className="font-display text-3xl font-semibold">{t("titles")}</h2>
        {titleFollows.length === 0 ? (
          <Empty text={t("noTitles")} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
              return (
                <MediaCard
                  key={follow.id}
                  href={`/title/${type}/${follow.tmdbId}`}
                  posterPath={follow.imagePath}
                  title={follow.title}
                  meta={follow.releaseDate?.slice(0, 4) ?? t(`types.${type}`)}
                  footer={
                    <div className="space-y-2 p-3">
                      <FollowButton targetType={type} tmdbId={follow.tmdbId} initialFollowing />
                      {overview.configured && (
                        <RequestButton
                          type={type}
                          tmdbId={follow.tmdbId}
                          compact
                          allowOptions={allowOptions}
                          options={{
                            rootFolders: options.rootFolders,
                            profiles: options.qualityProfiles,
                            defaultRootFolderPath: overview.rootFolderPath,
                            defaultProfileId: overview.qualityProfileId,
                          }}
                          initialState={state}
                        />
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
        <h2 className="font-display text-3xl font-semibold">{t("people")}</h2>
        {people.length === 0 ? (
          <Empty text={t("noPeople")} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {people.map((follow) => (
              <article key={follow.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <Link href={`/people/${follow.tmdbId}` as never}>
                  <MediaPoster
                    path={follow.imagePath ?? undefined}
                    alt={follow.title}
                    person
                    className="rounded-none border-0"
                  />
                  <div className="p-3 font-medium">{follow.title}</div>
                </Link>
                <div className="border-t border-border/60 p-3">
                  <FollowButton targetType="person" tmdbId={follow.tmdbId} initialFollowing />
                </div>
              </article>
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

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
      {text}
    </div>
  );
}
