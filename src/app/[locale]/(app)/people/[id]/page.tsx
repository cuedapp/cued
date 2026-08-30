import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, followService, radarrIntegrationService, recommendationService, sonarrIntegrationService, tmdbMetadataService } from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";
import { FollowButton } from "@/components/follow-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";
import { MediaCard } from "@/components/media-card";
import { BackButton } from "@/components/back-button";
import { RecommendationCardActions } from "@/components/recommendation-card-actions";
import { CreditFilters } from "./credit-filters";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string; type?: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const locale = await getLocale();
  const t = await getTranslations("Person");
  let person;
  try {
    person = await tmdbMetadataService.getPerson(user.id, id, locale);
  } catch {
    notFound();
  }
  const filters = await searchParams;
  const sort = ["popularity", "rating", "date", "title"].includes(filters.sort ?? "") ? filters.sort as "popularity" | "rating" | "date" | "title" : "popularity";
  const creditType = filters.type === "movie" || filters.type === "series" ? filters.type : "all";
  const visibleCredits = person.credits.filter((credit) => creditType === "all" || credit.type === creditType).sort((left, right) => sort === "rating" ? (right.rating ?? 0) - (left.rating ?? 0) : sort === "date" ? (right.date ?? "").localeCompare(left.date ?? "") : sort === "title" ? left.title.localeCompare(right.title) : (right.popularity ?? 0) - (left.popularity ?? 0)).slice(0, 60);
  const [isFollowing, radarr, sonarr, requestStates, titleFeedback] = await Promise.all([
    followService.isFollowing(user.id, "person", id),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    acquisitionService.getStates(visibleCredits.map((credit) => ({ type: credit.type, tmdbId: credit.id }))).catch(() => ({} as Record<string, "idle" | "pending" | "existing">)),
    recommendationService.getFeedbackByTitles(user.id, visibleCredits.map((credit) => ({ type: credit.type, tmdbId: credit.id }))),
  ]);
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const [radarrOptions, sonarrOptions] = allowRequestOptions ? await Promise.all([
    radarr.configured ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
    sonarr.configured ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
  ]) : [{ rootFolders: [], qualityProfiles: [], tags: [] }, { rootFolders: [], qualityProfiles: [], tags: [] }];

  return <div className="space-y-10">
    <BackButton />
    <section className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
      <MediaPoster path={person.profilePath} alt={person.name} person priority className="w-44 rounded-3xl md:w-full" />
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{person.department ?? t("person")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter sm:text-6xl">{person.name}</h1><div className="mt-4"><FollowButton targetType="person" tmdbId={id} initialFollowing={isFollowing} /></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{person.birthday && <span>{t("born", { date: person.birthday })}</span>}{person.deathday && <span>{t("died", { date: person.deathday })}</span>}{person.placeOfBirth && <span>{person.placeOfBirth}</span>}</div><p className="mt-6 whitespace-pre-line leading-8 text-muted-foreground">{person.biography || t("noBiography")}</p></div>
    </section>
    <section><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-display text-3xl font-semibold tracking-tight">{t("credits")}</h2><CreditFilters type={creditType} sort={sort} labels={{ allTypes: t("allTypes"), movie: t("types.movie"), series: t("types.series"), popularity: t("sort.popularity"), rating: t("sort.rating"), date: t("sort.date"), title: t("sort.title"), apply: t("apply") }} /></div>{visibleCredits.length === 0 ? <p className="mt-4 text-muted-foreground">{t("noCredits")}</p> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">{visibleCredits.map((credit) => { const overview = credit.type === "movie" ? radarr : sonarr; const options = credit.type === "movie" ? radarrOptions : sonarrOptions; const request = (overview.configured || credit.m3uAvailable) ? { type: credit.type, tmdbId: credit.id, allowOptions: allowRequestOptions, arrAvailable: overview.configured, strmAvailable: credit.m3uAvailable && !credit.available && !credit.strmAvailable && !credit.strmPending, strmAlreadyAvailable: credit.strmAvailable, strmImportPending: credit.strmPending, options: { rootFolders: options.rootFolders, profiles: options.qualityProfiles, defaultRootFolderPath: overview.rootFolderPath, defaultProfileId: overview.qualityProfileId }, initialState: credit.available ? "available" as const : requestStates[`${credit.type}:${credit.id}`] ?? "idle" as const } : undefined; return <MediaCard key={`${credit.type}-${credit.id}-${credit.role}`} href={`/title/${credit.type}/${credit.id}`} posterPath={credit.posterPath} title={credit.title} badges={<MediaCapabilityBadges available={credit.available} strmAvailable={credit.strmAvailable} strmPending={credit.strmPending} strmRequestable={credit.m3uAvailable} availableLabel={t("available")} strmAvailableLabel={t("strmAvailable")} strmPendingLabel={t("strmPending")} strmRequestableLabel={t("strmRequestable")} />} meta={credit.date?.slice(0, 4) ?? t(`types.${credit.type}`)} secondary={credit.role} footer={<RecommendationCardActions feedbackTarget={{ mediaType: credit.type, tmdbId: credit.id }} feedback={titleFeedback.get(`${credit.type}:${credit.id}`) ?? null} request={request} />} />; })}</div>}</section>
  </div>;
}
