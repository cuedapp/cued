import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BackButton } from "@/components/back-button";
import { RecommendationCard } from "@/components/recommendation-card";
import { RecommendationCardActions } from "@/components/recommendation-card-actions";
import { FollowButton } from "@/components/follow-button";
import { MediaGrid } from "@/components/media-grid";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  followService,
  radarrIntegrationService,
  recommendationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { tmdbImageUrl } from "@/server/integrations/tmdb/client";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const locale = await getLocale();
  const t = await getTranslations("Collection");
  const titleT = await getTranslations("Title");
  const cardT = await getTranslations("RecommendationCard");
  let collection;
  try {
    collection = await tmdbMetadataService.getCollectionForUser(user.id, id, locale);
  } catch {
    notFound();
  }
  const [acquisition, options, feedback, requestStates, follows, isFollowing] = await Promise.all([
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
            <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{collection.name}</h1>
            <p className="mt-4 leading-7 text-muted-foreground">{collection.overview || t("noOverview")}</p>
            <div className="mt-5">
              <FollowButton targetType="collection" tmdbId={id} initialFollowing={isFollowing} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">{t("titles")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("titleCount", { count: collection.parts.length })}</p>
          </div>
        </div>
        <MediaGrid className="mt-5">
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
                  aiExplanation: null,
                }}
                topLeft={
                  item.rating > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                      <Star className="size-3 fill-current text-primary" />
                      {item.rating.toFixed(1)}
                    </span>
                  ) : undefined
                }
                availableLabel={titleT("available")}
                strmAvailableLabel={titleT("strmAvailable")}
                strmPendingLabel={titleT("strmPending")}
                strmRequestableLabel={titleT("strmRequestable")}
                typeLabel={titleT("types.movie")}
                whyLabel={t("titles")}
                closeLabel={cardT("close")}
                aiReasonLabel={cardT("aiReason")}
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
