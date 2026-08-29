import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock3, Sparkles, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate, formatDisplayTime, formatRelativeDate } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, followService, radarrIntegrationService, recommendationService, sonarrIntegrationService, tasteService, tmdbMetadataService } from "@/server/application/services";
import { tmdbImageUrl } from "@/server/integrations/tmdb/client";
import { MediaPoster } from "@/components/media-poster";
import { RatingForm } from "../../../history/rating-form";
import { RequestButton } from "@/components/request-button";
import { FollowButton } from "@/components/follow-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";

export default async function TitlePage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id: rawId } = await params;
  const id = Number(rawId);
  if ((type !== "movie" && type !== "series") || !Number.isSafeInteger(id) || id <= 0) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const locale = await getLocale();
  const t = await getTranslations("Title");
  const historyT = await getTranslations("History");
  const recommendationT = await getTranslations("Recommendations");
  let title;
  try {
    title = await tmdbMetadataService.getTitle(user.id, type, id, locale);
  } catch {
    notFound();
  }
  const trailer = title.videos.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official)
    ?? title.videos.find((video) => video.site === "YouTube" && video.type === "Trailer");
  const providerService = type === "movie" ? radarrIntegrationService : sonarrIntegrationService;
  const [history, recommendation, acquisition, isFollowing] = await Promise.all([
    tasteService.getHistory(user.id),
    recommendationService.getForTitle(user.id, type, id),
    providerService.getOverview(),
    followService.isFollowing(user.id, type, id),
  ]);
  const acquisitionOptions = acquisition.configured ? await providerService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : { rootFolders: [], qualityProfiles: [], tags: [] };
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const acquisitionState = acquisition.configured ? await acquisitionService.getState(type, id).catch(() => "requestable" as const) : "unavailable" as const;
  const historyItem = history.find((item) => item.tmdbId === id && item.kind === type);
  const likedSources = recommendation?.sourceTitles.filter((source) => source.reason === "liked") ?? [];
  const watchedSources = recommendation?.sourceTitles.filter((source) => source.reason === "watched") ?? [];

  return <div className="space-y-10">
    <section className="relative -mx-5 -mt-5 overflow-hidden border-b border-border/60 sm:-mx-8 sm:-mt-8 lg:-mx-12 lg:-mt-12">
      {title.backdropPath && <div className="absolute inset-0"><Image src={tmdbImageUrl(title.backdropPath, "original")} alt="" fill priority sizes="100vw" className="object-cover opacity-30" /><div className="absolute inset-0 bg-linear-to-b from-background/30 via-background/75 to-background" /></div>}
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 pb-12 pt-16 sm:px-8 md:flex-row md:items-end lg:px-12 lg:pt-28">
        <MediaPoster path={title.posterPath} alt={title.title} priority className="w-40 shrink-0 rounded-2xl shadow-2xl sm:w-52" />
        <div className="max-w-3xl pb-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>{t(`types.${title.type}`)}</span>{title.date && <span>· {title.date.slice(0, 4)}</span>}{title.runtimeMinutes && <span className="inline-flex items-center gap-1"><Clock3 className="size-4" />{t("minutes", { count: title.runtimeMinutes })}</span>}<span className="inline-flex items-center gap-1"><Star className="size-4 fill-current text-amber-500" />{title.rating.toFixed(1)}</span></div>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter sm:text-6xl">{title.title}</h1>
          {title.tagline && <p className="mt-3 text-lg italic text-muted-foreground">{title.tagline}</p>}
          <div className="mt-5 flex items-center gap-2"><MediaCapabilityBadges available={title.available} strmAvailable={title.strmAvailable} strmPending={title.strmPending} strmRequestable={title.m3uAvailable} availableLabel={t("available")} strmAvailableLabel={t("strmAvailable")} strmPendingLabel={t("strmPending")} strmRequestableLabel={t("strmRequestable")} /></div>
          {title.strmPending && <p className="mt-3 max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-foreground" role="status">{t("strmPendingDetail")}</p>}
          <div className="mt-5 flex flex-wrap gap-2"><FollowButton targetType={type} tmdbId={id} initialFollowing={isFollowing} />{(acquisition.configured || title.m3uAvailable) && <RequestButton type={type} tmdbId={id} allowOptions={allowRequestOptions} arrAvailable={acquisition.configured} strmAvailable={title.m3uAvailable && !title.available && !title.strmAvailable && !title.strmPending} strmAlreadyAvailable={title.strmAvailable} strmImportPending={title.strmPending} options={{ rootFolders: acquisitionOptions.rootFolders, profiles: acquisitionOptions.qualityProfiles, defaultRootFolderPath: acquisition.rootFolderPath, defaultProfileId: acquisition.qualityProfileId }} initialState={title.available ? "available" : acquisitionState === "existing" || acquisitionState === "pending" ? acquisitionState : "idle"} />}</div>
          <div className="mt-5 flex flex-wrap gap-2">{title.genres.map((genre) => <span key={genre.id} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs">{genre.name}</span>)}</div>
        </div>
      </div>
    </section>

    <section className="max-w-4xl"><h2 className="font-display text-3xl font-semibold tracking-tight">{t("overview")}</h2><p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">{title.overview || t("noOverview")}</p>{title.type === "series" && <div className="mt-5 flex gap-6 text-sm"><span>{t("seasons", { count: title.seasons ?? 0 })}</span><span>{t("episodes", { count: title.episodes ?? 0 })}</span></div>}</section>

    {recommendation && <section className="max-w-4xl rounded-2xl border border-primary/25 bg-primary/5 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t("recommendedForYou")}</p><h2 className="mt-1 font-display text-2xl font-semibold">{t("recommendationDetails")}</h2></div></div><span className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">{recommendation.matchPercent}%</span></div><div className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">{recommendation.aiExplanation && <p className="text-foreground">{recommendation.aiExplanation}</p>}{likedSources.length > 0 && <p>{recommendationT("becauseTitles", { titles: likedSources.map((source) => source.title).join(", ") })}</p>}{watchedSources.length > 0 && <p>{recommendationT("becauseWatched", { titles: watchedSources.map((source) => source.title).join(", ") })}</p>}{likedSources.length === 0 && watchedSources.length === 0 && recommendation.reasons.length > 0 && <p>{recommendationT("becauseGenres", { genres: recommendation.reasons.join(", ") })}</p>}</div></section>}

    {historyItem && <section className="max-w-4xl rounded-2xl border border-border/70 bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold tracking-tight">{t("yourRating")}</h2>{historyItem.lastPlayedAt && <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground" title={`${formatDisplayDate(historyItem.lastPlayedAt, user.dateFormat)} ${formatDisplayTime(historyItem.lastPlayedAt, user.timeFormat, locale)}`}><Clock3 className="size-3.5" />{historyT("watchedAt", { date: formatRelativeDate(historyItem.lastPlayedAt, new Date(), locale, user.dateFormat), time: formatDisplayTime(historyItem.lastPlayedAt, user.timeFormat, locale) })}</div>}</div><RatingForm mediaItemId={historyItem.id} rating={historyItem.rating} feedback={historyItem.feedback} tags={historyItem.tags ?? []} excluded={historyItem.excluded} /></section>}

    {trailer && <section><h2 className="font-display text-3xl font-semibold tracking-tight">{t("trailer")}</h2><div className="mt-5 aspect-video max-w-4xl overflow-hidden rounded-3xl border border-border bg-black"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}`} title={trailer.name} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}

    {title.cast.length > 0 && <section><h2 className="font-display text-3xl font-semibold tracking-tight">{t("cast")}</h2><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{title.cast.slice(0, 10).map((person) => <Link key={`${person.id}-${person.role}`} href={`/people/${person.id}` as const} className="group overflow-hidden rounded-2xl border border-border/60 bg-card outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><MediaPoster path={person.profilePath} alt={person.name} person /><div className="p-3"><div className="font-medium group-hover:text-primary">{person.name}</div><div className="mt-1 text-sm text-muted-foreground">{person.role}</div></div></Link>)}</div></section>}

    {title.crew.length > 0 && <section><h2 className="font-display text-3xl font-semibold tracking-tight">{t("crew")}</h2><div className="mt-4 flex flex-wrap gap-3">{title.crew.map((person) => <Link key={`${person.id}-${person.role}`} href={`/people/${person.id}` as const} className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40"><span className="font-medium">{person.name}</span><span className="ml-2 text-sm text-muted-foreground">{person.role}</span></Link>)}</div></section>}
  </div>;
}
