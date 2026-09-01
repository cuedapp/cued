import type { TmdbCandidate, TmdbMediaType } from "@/server/integrations/tmdb/provider";

export interface RecommendationSignal {
  tmdbId: number;
  type: TmdbMediaType;
  rating: number | null;
  tags?: string[];
  feedback?: string;
  played: boolean;
  playedPercentage: number | null;
  excluded: boolean;
  genres: Array<{ id: number; name: string }>;
  title?: string;
  excludeCandidate?: boolean;
  feedbackUpdatedAt?: Date | null;
  lastPlayedAt?: Date | null;
}

export interface ScoredRecommendation extends TmdbCandidate {
  score: number;
  matchPercent: number;
  reasons: string[];
  sourceTitles: Array<{ id: number; type: TmdbMediaType; title: string; reason: "liked" | "watched" }>;
  aiScore?: number;
  aiExplanation?: string;
}

export function buildGenreTaste(signals: RecommendationSignal[]) {
  const weights = new Map<number, { name: string; weight: number }>();
  for (const signal of signals) {
    const weight = signalWeight(signal);
    if (weight === 0 || signal.genres.length === 0) continue;
    for (const genre of signal.genres) {
      const current = weights.get(genre.id);
      weights.set(genre.id, {
        name: current?.name ?? genre.name,
        weight: (current?.weight ?? 0) + weight / Math.sqrt(signal.genres.length),
      });
    }
  }
  return weights;
}

export function scoreCandidates(
  candidates: TmdbCandidate[],
  signals: RecommendationSignal[],
  previousScores = new Map<string, number>(),
  excludedTitles = new Set<string>(),
  similarSources = new Map<
    string,
    Array<{ id: number; type: TmdbMediaType; title: string; reason: "liked" | "watched" }>
  >(),
) {
  const taste = buildGenreTaste(signals);
  const strongestPositiveGenre = Math.max(1, ...[...taste.values()].map((genre) => Math.max(0, genre.weight)));
  const strongestNegativeGenre = Math.max(
    1,
    ...[...taste.values()].map((genre) => Math.abs(Math.min(0, genre.weight))),
  );
  const seen = new Set([
    ...excludedTitles,
    ...signals.filter((signal) => signal.excludeCandidate !== false).map((signal) => `${signal.type}:${signal.tmdbId}`),
  ]);
  return candidates
    .filter((candidate) => !seen.has(`${candidate.type}:${candidate.id}`))
    .map((candidate): ScoredRecommendation => {
      const genreWeights = candidate.genreIds
        .map((id) => taste.get(id))
        .filter((genre): genre is { name: string; weight: number } => Boolean(genre));
      const matchingGenres = genreWeights
        .filter((genre) => genre.weight > 0 && genre.name)
        .sort((a, b) => b.weight - a.weight);
      const genreCount = Math.max(genreWeights.length, 1);
      const positiveAffinity =
        genreWeights.reduce((sum, genre) => sum + Math.max(0, genre.weight) / strongestPositiveGenre, 0) / genreCount;
      const negativeAffinity =
        genreWeights.reduce((sum, genre) => sum + Math.abs(Math.min(0, genre.weight)) / strongestNegativeGenre, 0) /
        genreCount;
      const genreScore = positiveAffinity * 30 - negativeAffinity * 15;
      const qualityScore = Math.min(candidate.rating, 10) * 1.8;
      const confidenceScore = Math.min(Math.log10(candidate.voteCount + 1) * 2.5, 10);
      const popularityScore = Math.min(Math.log10(candidate.popularity + 1) * 1.5, 6);
      const sourceTitles = similarSources.get(`${candidate.type}:${candidate.id}`) ?? [];
      const similarityScore = sourceTitles.length > 0 ? 12 : 0;
      const freshScore = 30 + genreScore + qualityScore + confidenceScore + popularityScore + similarityScore;
      const previous = previousScores.get(`${candidate.type}:${candidate.id}`);
      const usablePrevious = previous !== undefined && previous >= 0 && previous <= 150 ? previous : undefined;
      const score = usablePrevious === undefined ? freshScore : usablePrevious * 0.7 + freshScore * 0.3;
      const matchPercent = Math.round(
        Math.max(
          1,
          Math.min(
            98,
            40 +
              positiveAffinity * 30 -
              negativeAffinity * 15 +
              (sourceTitles.length > 0 ? 15 : 0) +
              candidate.rating +
              confidenceScore * 0.5,
          ),
        ),
      );
      return {
        ...candidate,
        score: Math.round(score * 100) / 100,
        matchPercent,
        reasons: matchingGenres.slice(0, 2).map((genre) => genre.name),
        sourceTitles: sourceTitles.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score || b.voteCount - a.voteCount);
}

function signalWeight(signal: RecommendationSignal) {
  if (signal.excluded) return -5;
  if (signal.rating !== null)
    return ({ 1: -4, 2: -2, 3: 0.5, 4: 2.5, 5: 4 } as Record<number, number>)[signal.rating] ?? 0;
  if (signal.played) return 1.5;
  const progress = signal.playedPercentage ?? 0;
  if (progress >= 50) return 1;
  if (progress >= 20) return 0.25;
  return 0;
}
