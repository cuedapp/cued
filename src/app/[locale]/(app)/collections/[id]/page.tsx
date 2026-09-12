import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BackButton } from "@/components/back-button";
import { RecommendationCard } from "@/components/recommendation-card";
import { PosterBadge } from "@/components/poster-badge";
import { WatchedBadge } from "@/components/watched-badge";
import { LibraryPoster } from "@/components/library-poster";
import { ContentRatingBadge } from "@/components/content-rating-badge";
import { CollectionRequest } from "@/components/collection-request";
import { Link } from "@/i18n/navigation";
import { RecommendationCardActions } from "@/components/recommendation-card-actions";
import { FollowButton } from "@/components/follow-button";
import { MediaGrid } from "@/components/media-grid";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  collectionService,
  followService,
  radarrIntegrationService,
  recommendationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { tmdbImageUrl } from "@/server/integrations/tmdb/client";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!Number.isSafeInteger(id) || id <= 0) return renderLocalCollection(user.id, rawId);
  const locale = await getLocale();
  const t = await getTranslations("Collection");
  const titleT = await getTranslations("Title");
  const cardT = await getTranslations("RecommendationCard");
  const collectionsT = await getTranslations("Collections");
  let collection;
  try {
    collection = await tmdbMetadataService.getCollectionForUser(user.id, id, locale);
  } catch {
    notFound();
  }
  const [acquisition, options, feedback, requestStates, follows, isFollowing, importedCollection] = await Promise.all([
    radarrIntegrationService.getOverview(),
    radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })),
    recommendationService.getFeedbackByTitles(
      user.id,
      collection.parts.map((item) => ({ type: item.type, tmdbId: item.id })),
    ),
    acquisitionService
      .getStates(collection.parts.map((item) => ({ type: item.type, tmdbId: item.id })))
      .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">),
    followService.list(user.id),
    followService.isFollowing(user.id, "collection", id),
    collectionService.getByTmdbIdForUser(user.id, id),
  ]);
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const followedTitles = new Set(
    follows
      .filter((follow) => follow.targetType === "movie" || follow.targetType === "series")
      .map((follow) => `${follow.targetType}:${follow.tmdbId}`),
  );

  return (
    <div className="space-y-8">
      <section className="relative -mx-5 -mt-5 overflow-hidden border-b border-border/60 sm:-mx-8 sm:-mt-8 lg:-mx-12 lg:-mt-12">
        {collection.backdropPath && (
          <Image
            src={tmdbImageUrl(collection.backdropPath, "original")}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-background/30 via-background/75 to-background" />
        <div className="relative px-5 pb-12 pt-6 sm:px-8 lg:px-12">
          <BackButton />
          <div className="mt-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
            <h1 className="mt-3 break-words font-display text-4xl font-semibold tracking-tighter sm:text-5xl">
              {collection.name}
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">{collection.overview || t("noOverview")}</p>
            <div className="mt-5">
              <FollowButton targetType="collection" tmdbId={id} initialFollowing={isFollowing} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <CollectionRequest
          titles={collection.parts.flatMap((item) => {
            const key = `${item.type}:${item.id}`;
            const idle = (requestStates[key] ?? "idle") === "idle";
            if (item.available || item.strmAvailable || item.strmPending || !idle) return [];
            return [{ tmdbId: item.id, title: item.title, arr: acquisition.configured, strm: item.m3uAvailable }];
          })}
          options={{
            rootFolders: options.rootFolders,
            profiles: options.qualityProfiles,
            defaultRootFolderPath: acquisition.rootFolderPath,
            defaultProfileId: acquisition.qualityProfileId,
          }}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("titles")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("titleCount", { count: collection.parts.length })}</p>
            {importedCollection && (
              <p className="mt-1 text-sm font-medium text-primary">
                {collectionsT("completeness", {
                  available: collection.parts.filter((item) => item.available || item.strmAvailable).length,
                  total: collection.parts.length,
                })}
              </p>
            )}
          </div>
        </div>
        <MediaGrid density="compact">
          {collection.parts.map((item) => {
            const key = `${item.type}:${item.id}`;
            const hasRequest = acquisition.configured || item.m3uAvailable;
            return (
              <RecommendationCard
                key={key}
                item={{
                  tmdbId: item.id,
                  mediaType: item.type,
                  title: item.title,
                  posterPath: item.posterPath ?? null,
                  releaseDate: item.date ?? null,
                  matchPercent: 0,
                  available: item.available,
                  strmAvailable: item.strmAvailable,
                  strmPending: item.strmPending,
                  m3uAvailable: item.m3uAvailable,
                  watched: item.watched,
                  partiallyWatched: item.partiallyWatched,
                  aiExplanation: null,
                  contentRatingAge: item.contentRatingAge,
                }}
                topLeft={
                  <>
                    {item.rating > 0 && (
                      <PosterBadge>
                        <Star className="size-3 fill-current text-primary" />
                        {item.rating.toFixed(1)}
                      </PosterBadge>
                    )}
                    {!item.available && !item.strmAvailable && (
                      <PosterBadge variant="danger">{collectionsT("missingBadge")}</PosterBadge>
                    )}
                  </>
                }
                availableLabel={titleT("available")}
                strmAvailableLabel={titleT("strmAvailable")}
                strmPendingLabel={titleT("strmPending")}
                strmRequestableLabel={titleT("strmRequestable")}
                typeLabel={titleT("types.movie")}
                whyLabel={t("titles")}
                closeLabel={cardT("close")}
                aiReasonLabel={cardT("aiReason")}
                watchedLabel={titleT("watched")}
                partiallyWatchedLabel={titleT("partiallyWatched")}
                footer={
                  <RecommendationCardActions
                    feedbackTarget={{ mediaType: "movie", tmdbId: item.id, title: item.title, overview: item.overview }}
                    feedback={feedback.get(key) ?? null}
                    follow={{ targetType: "movie", tmdbId: item.id, initialFollowing: followedTitles.has(key) }}
                    request={
                      hasRequest
                        ? {
                            type: "movie",
                            tmdbId: item.id,
                            options: {
                              rootFolders: options.rootFolders,
                              profiles: options.qualityProfiles,
                              defaultRootFolderPath: acquisition.rootFolderPath,
                              defaultProfileId: acquisition.qualityProfileId,
                            },
                            allowOptions: allowRequestOptions,
                            arrAvailable: acquisition.configured,
                            strmAvailable:
                              item.m3uAvailable && !item.available && !item.strmAvailable && !item.strmPending,
                            strmAlreadyAvailable: item.strmAvailable,
                            strmImportPending: item.strmPending,
                            initialState: item.available ? "available" : (requestStates[key] ?? "idle"),
                          }
                        : undefined
                    }
                  />
                }
              />
            );
          })}
        </MediaGrid>
      </section>
    </div>
  );
}

async function renderLocalCollection(userId: string, collectionId: string) {
  const collection = await collectionService.getForUser(userId, collectionId);
  if (!collection) notFound();
  const t = await getTranslations("Collections");
  const titleT = await getTranslations("Title");
  return (
    <div className="space-y-8">
      <div>
        <BackButton />
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {t(collection.source === "tmdb" ? "tmdb" : "manual")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tighter sm:text-5xl">{collection.name}</h1>
        <p className="mt-3 text-muted-foreground">{t("itemCount", { count: collection.items.length })}</p>
      </div>
      <MediaGrid density="compact">
        {collection.items.map((item) => {
          const body = (
            <>
              <div className="relative">
                <LibraryPoster mediaItemId={item.id} title={item.title} />
                {item.watched && (
                  <div className="absolute right-2 top-2">
                    <WatchedBadge label={titleT("watched")} />
                  </div>
                )}
                {item.partiallyWatched && (
                  <div className="absolute right-2 top-2">
                    <WatchedBadge state="partial" label={titleT("partiallyWatched")} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h2 className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{item.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {item.year && <span>{item.year}</span>}
                  <ContentRatingBadge age={item.contentRatingAge} />
                </div>
              </div>
            </>
          );
          return (
            <article
              key={item.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              {item.tmdbId ? (
                <Link
                  href={`/title/${item.type}/${item.tmdbId}` as never}
                  className="block flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </article>
          );
        })}
      </MediaGrid>
    </div>
  );
}
