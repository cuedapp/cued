import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  followService,
  radarrIntegrationService,
  recommendationService,
  sonarrIntegrationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";
import { MediaGrid } from "@/components/media-grid";
import { FollowButton } from "@/components/follow-button";
import { BackButton } from "@/components/back-button";
import { RecommendationCardActions } from "@/components/recommendation-card-actions";
import { RecommendationCard } from "@/components/recommendation-card";
import { CreditFilters } from "./credit-filters";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; type?: string; role?: string; hideGuest?: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const locale = await getLocale();
  const t = await getTranslations("Person");
  const cardT = await getTranslations("RecommendationCard");
  let person;
  try {
    person = await tmdbMetadataService.getPerson(user.id, id, locale);
  } catch {
    notFound();
  }
  const filters = await searchParams;
  const sort = ["popularity", "rating", "date", "title"].includes(filters.sort ?? "")
    ? (filters.sort as "popularity" | "rating" | "date" | "title")
    : "popularity";
  const creditType = filters.type === "movie" || filters.type === "series" ? filters.type : "all";
  const roleFilter = ["acting", "directing", "writing", "producing"].includes(filters.role ?? "")
    ? (filters.role as "acting" | "directing" | "writing" | "producing")
    : "all";
  const hideGuest = filters.hideGuest === "true";
  const visibleCredits = person.credits
    .filter((credit) => creditType === "all" || credit.type === creditType)
    .filter((credit) => {
      if (roleFilter === "all") return true;
      if (roleFilter === "acting") return credit.roleKinds?.includes("cast") ?? false;
      if (roleFilter === "directing") return /director|creator/i.test(credit.role);
      if (roleFilter === "writing") return /writer|screenplay|story|novel/i.test(credit.role);
      return /producer/i.test(credit.role);
    })
    .filter((credit) => !hideGuest || !/\b(self|himself|herself|guest)\b/i.test(credit.role))
    .sort((left, right) =>
      sort === "rating"
        ? (right.rating ?? 0) - (left.rating ?? 0)
        : sort === "date"
          ? (right.date ?? "").localeCompare(left.date ?? "")
          : sort === "title"
            ? left.title.localeCompare(right.title)
            : (right.popularity ?? 0) - (left.popularity ?? 0),
    )
    .slice(0, 60);
  const [isFollowing, radarr, sonarr, requestStates, titleFeedback, follows] = await Promise.all([
    followService.isFollowing(user.id, "person", id),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    acquisitionService
      .getStates(visibleCredits.map((credit) => ({ type: credit.type, tmdbId: credit.id })))
      .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">),
    recommendationService.getFeedbackByTitles(
      user.id,
      visibleCredits.map((credit) => ({ type: credit.type, tmdbId: credit.id })),
    ),
    followService.list(user.id),
  ]);
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const [radarrOptions, sonarrOptions] = allowRequestOptions
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
  const followedTitles = new Set(
    follows
      .filter((follow) => follow.targetType === "movie" || follow.targetType === "series")
      .map((follow) => `${follow.targetType}:${follow.tmdbId}`),
  );

  return (
    <div className="space-y-10">
      <BackButton />
      <section className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
        <MediaPoster
          path={person.profilePath}
          alt={person.name}
          person
          priority
          className="w-44 rounded-3xl md:w-full"
        />
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {person.department ?? t("person")}
          </p>
          <h1 className="mt-3 break-words font-display text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-6xl">
            {person.name}
          </h1>
          <div className="mt-4">
            <FollowButton targetType="person" tmdbId={id} initialFollowing={isFollowing} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {person.birthday && <span>{t("born", { date: person.birthday })}</span>}
            {person.deathday && <span>{t("died", { date: person.deathday })}</span>}
            {person.placeOfBirth && <span>{person.placeOfBirth}</span>}
          </div>
          {person.biography ? (
            <details className="group mt-6">
              <summary className="cursor-pointer list-none whitespace-pre-line leading-8 text-muted-foreground marker:hidden">
                <span className="line-clamp-5 group-open:line-clamp-none">{person.biography}</span>
                <span className="mt-2 inline-block text-sm font-medium text-primary group-open:hidden">
                  {t("readMore")}
                </span>
                <span className="mt-2 hidden text-sm font-medium text-primary group-open:inline">{t("showLess")}</span>
              </summary>
            </details>
          ) : (
            <p className="mt-6 leading-8 text-muted-foreground">{t("noBiography")}</p>
          )}
        </div>
      </section>
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("credits")}</h2>
        </div>
        <CreditFilters
          type={creditType}
          sort={sort}
          labels={{
            allTypes: t("allTypes"),
            movie: t("types.movie"),
            series: t("types.series"),
            popularity: t("sort.popularity"),
            rating: t("sort.rating"),
            date: t("sort.date"),
            title: t("sort.title"),
            apply: t("apply"),
            filterTitle: t("filterTitle"),
            filterHelp: t("filterHelp"),
            activeFilters: t("activeFilters"),
            clear: t("clear"),
            sortLabel: t("sortLabel"),
            roleLabel: t("roleLabel"),
            allRoles: t("allRoles"),
            acting: t("roles.acting"),
            directing: t("roles.directing"),
            writing: t("roles.writing"),
            producing: t("roles.producing"),
            hideGuest: t("hideGuest"),
          }}
          role={roleFilter}
          hideGuest={hideGuest}
        />
        {visibleCredits.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{t("noCredits")}</p>
        ) : (
          <MediaGrid density="compact" className="mt-5">
            {visibleCredits.map((credit) => {
              const overview = credit.type === "movie" ? radarr : sonarr;
              const options = credit.type === "movie" ? radarrOptions : sonarrOptions;
              const request =
                overview.configured || credit.m3uAvailable
                  ? {
                      type: credit.type,
                      tmdbId: credit.id,
                      allowOptions: allowRequestOptions,
                      arrAvailable: overview.configured,
                      strmAvailable:
                        credit.m3uAvailable && !credit.available && !credit.strmAvailable && !credit.strmPending,
                      strmAlreadyAvailable: credit.strmAvailable,
                      strmImportPending: credit.strmPending,
                      options: {
                        rootFolders: options.rootFolders,
                        profiles: options.qualityProfiles,
                        defaultRootFolderPath: overview.rootFolderPath,
                        defaultProfileId: overview.qualityProfileId,
                      },
                      initialState: credit.available
                        ? ("available" as const)
                        : (requestStates[`${credit.type}:${credit.id}`] ?? ("idle" as const)),
                    }
                  : undefined;
              return (
                <RecommendationCard
                  key={`${credit.type}-${credit.id}-${credit.role}`}
                  item={{
                    tmdbId: credit.id,
                    mediaType: credit.type,
                    title: credit.title,
                    posterPath: credit.posterPath ?? null,
                    releaseDate: credit.date ?? null,
                    matchPercent: 0,
                    available: credit.available,
                    strmAvailable: credit.strmAvailable,
                    strmPending: credit.strmPending,
                    m3uAvailable: credit.m3uAvailable,
                    aiExplanation: null,
                    contentRatingAge: credit.contentRatingAge,
                  }}
                  topLeft={
                    credit.rating && credit.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                        <Star className="size-3 fill-current text-primary" />
                        {credit.rating.toFixed(1)}
                      </span>
                    ) : undefined
                  }
                  availableLabel={t("available")}
                  strmAvailableLabel={t("strmAvailable")}
                  strmPendingLabel={t("strmPending")}
                  strmRequestableLabel={t("strmRequestable")}
                  typeLabel={t(`types.${credit.type}`)}
                  whyLabel={t("credits")}
                  closeLabel={cardT("close")}
                  aiReasonLabel={cardT("aiReason")}
                  footer={
                    <RecommendationCardActions
                      feedbackTarget={{ mediaType: credit.type, tmdbId: credit.id, title: credit.title }}
                      feedback={titleFeedback.get(`${credit.type}:${credit.id}`) ?? null}
                      request={request}
                      follow={{
                        targetType: credit.type,
                        tmdbId: credit.id,
                        initialFollowing: followedTitles.has(`${credit.type}:${credit.id}`),
                      }}
                    />
                  }
                />
              );
            })}
          </MediaGrid>
        )}
      </section>
    </div>
  );
}
