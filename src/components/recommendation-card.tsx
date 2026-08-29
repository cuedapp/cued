import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { MediaPoster } from "./media-poster";
import { MediaCapabilityBadges } from "./media-capability-badges";

export interface RecommendationCardItem {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  matchPercent: number;
  available: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
  aiExplanation: string | null;
}

export function RecommendationCard({ item, availableLabel, strmAvailableLabel, strmPendingLabel, strmRequestableLabel, typeLabel, becauseLiked, becauseWatched, becauseGenres, footer }: { item: RecommendationCardItem; availableLabel: string; strmAvailableLabel: string; strmPendingLabel: string; strmRequestableLabel: string; typeLabel: string; becauseLiked?: string; becauseWatched?: string; becauseGenres?: string; footer?: ReactNode }) {
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
    <Link href={`/title/${item.mediaType}/${item.tmdbId}` as never} className="flex flex-1 flex-col rounded-t-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
      <MediaPoster path={item.posterPath ?? undefined} alt={item.title} className="rounded-none border-0" badges={<><span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">{item.matchPercent}%</span><MediaCapabilityBadges available={item.available} strmAvailable={item.strmAvailable} strmPending={item.strmPending} strmRequestable={item.m3uAvailable} availableLabel={availableLabel} strmAvailableLabel={strmAvailableLabel} strmPendingLabel={strmPendingLabel} strmRequestableLabel={strmRequestableLabel} /></>} />
      <div className="flex-1 p-3"><h2 className="line-clamp-2 font-medium group-hover:text-primary">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">{item.releaseDate?.slice(0, 4) ?? typeLabel}</p>{becauseLiked && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{becauseLiked}</p>}{becauseWatched && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{becauseWatched}</p>}{item.aiExplanation ? <p className="mt-2 line-clamp-3 text-xs text-primary">{item.aiExplanation}</p> : becauseGenres ? <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{becauseGenres}</p> : null}</div>
    </Link>
    {footer && <div className="mt-auto border-t border-border/60">{footer}</div>}
  </article>;
}
