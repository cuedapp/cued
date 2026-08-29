import { createHash } from "node:crypto";
import type { RecommendationRepository } from "@/server/db/repositories/recommendation.repository";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type { TmdbMediaType } from "@/server/integrations/tmdb/provider";
import type { TmdbMetadataService } from "./tmdb-metadata.service";
import { buildGenreTaste, scoreCandidates, type RecommendationSignal } from "./recommendation-scoring";
import type { AiEnhancementService } from "./ai-enhancement.service";
import { logger } from "@/lib/logger";

const refreshIntervalMs = 24 * 60 * 60 * 1_000;
const positiveTags = new Set(["fun", "noBrainerAction", "comfortWatch", "greatCharacters", "smart", "moving", "suspenseful", "feelGood", "exciting", "rewatchable"]);

export class RecommendationService {
  constructor(
    private readonly repository: RecommendationRepository,
    private readonly tmdbRepository: TmdbRepository,
    private readonly metadataService: TmdbMetadataService,
    private readonly aiEnhancement?: AiEnhancementService,
  ) {}

  async getForDashboard(userId: string) {
    return this.withAvailability(userId, await this.repository.getRecommendations(userId));
  }

  async getAll(userId: string) {
    return this.withAvailability(userId, await this.repository.getRecommendations(userId, false, 500));
  }

  async getHidden(userId: string) {
    return this.withAvailability(userId, await this.repository.getRecommendations(userId, true));
  }

  async getForTitle(userId: string, type: "movie" | "series", tmdbId: number) {
    return this.repository.getRecommendation(userId, type, tmdbId);
  }

  async refresh(userId: string, locale: string, force = false, runId?: string) {
    const signals = await this.loadSignals(userId, locale, runId);
    const fingerprint = fingerprintSignals(signals);
    const state = await this.repository.getRefreshState(userId);
    if (!force && state?.signalFingerprint === fingerprint && state.locale === locale && Date.now() - state.refreshedAt.getTime() < refreshIntervalMs) return;

    const taste = buildGenreTaste(signals);
    const topGenreIds = [...taste.entries()].filter(([, genre]) => genre.weight > 0).sort((a, b) => b[1].weight - a[1].weight).slice(0, 5).map(([id]) => id);
    if (topGenreIds.length === 0) {
      throw new Error("No positive taste signals were found for recommendation discovery");
    }

    if (runId) await this.repository.updateRun(runId, { phase: "candidates", processedItems: signals.length, totalItems: signals.length });

    const similaritySeeds = selectSimilaritySeeds(signals);
    const [movies, series, similarityResults] = await Promise.all([
      this.metadataService.discover("movie", topGenreIds, locale),
      this.metadataService.discover("series", topGenreIds, locale),
      Promise.allSettled(similaritySeeds.map((signal) => this.metadataService.getRecommendations(signal.type, signal.tmdbId, locale))),
    ]);
    const similarSources = new Map<string, Array<{ id: number; type: TmdbMediaType; title: string; reason: "liked" | "watched" }>>();
    similarityResults.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const seed = similaritySeeds[index];
      if (!seed?.title) return;
      for (const candidate of result.value.results) {
        const key = `${candidate.type}:${candidate.id}`;
        const current = similarSources.get(key) ?? [];
        if (!current.some((item) => item.id === seed.tmdbId && item.type === seed.type)) current.push({ id: seed.tmdbId, type: seed.type, title: seed.title, reason: isLiked(seed) ? "liked" : "watched" });
        similarSources.set(key, current);
      }
    });
    const similarCandidates = similarityResults.flatMap((result) => result.status === "fulfilled" ? result.value.results : []);
    const movieCandidates = deduplicateCandidates([...similarCandidates.filter((item) => item.type === "movie"), ...movies.results]);
    const seriesCandidates = deduplicateCandidates([...similarCandidates.filter((item) => item.type === "series"), ...series.results]);
    const [previousScores, watchedTitles] = await Promise.all([
      this.repository.getExistingScores(userId),
      this.repository.getWatchedTitles(userId),
    ]);
    const watched = new Set(watchedTitles.flatMap((item) => item.tmdbId !== null && (item.type === "movie" || item.type === "series") ? [`${item.type}:${item.tmdbId}`] : []));
    const scoredMovies = scoreCandidates(movieCandidates, signals, previousScores, watched, similarSources).slice(0, 12);
    const scoredSeries = scoreCandidates(seriesCandidates, signals, previousScores, watched, similarSources).slice(0, 12);
    if (scoredMovies.length + scoredSeries.length === 0) throw new Error("TMDB discovery returned no eligible recommendation candidates");
    const deterministic = [...scoredMovies, ...scoredSeries];
    if (runId && this.aiEnhancement) await this.repository.updateRun(runId, { phase: "ai" });
    const enhanced = this.aiEnhancement ? await this.aiEnhancement.enhance(userId, locale, signals, deterministic) : deterministic;
    await this.repository.saveRecommendations(userId, enhanced);
    await this.repository.setRefreshState(userId, fingerprint, locale);
  }

  async startRefresh(userId: string, locale: string, force = false) {
    if (!(await this.repository.hasTasteSignals(userId))) return false;
    const run = await this.repository.startRun(userId);
    if (!run) return false;
    logger.info("Recommendation refresh started", { userId, runId: run.id, locale, forced: force });
    void this.refresh(userId, locale, force, run.id)
      .then(async () => {
        await this.repository.completeRun(run.id);
        logger.info("Recommendation refresh completed", { userId, runId: run.id });
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : "Recommendation refresh failed";
        await this.repository.failRun(run.id, message);
        logger.error("Recommendation refresh failed", { userId, runId: run.id, error: message });
      });
    return true;
  }

  async getStatus(userId: string) {
    const [run, state, hasTasteSignals] = await Promise.all([
      this.repository.getLatestRun(userId),
      this.repository.getRefreshState(userId),
      this.repository.hasTasteSignals(userId),
    ]);
    return {
      run: hasTasteSignals ? run : undefined,
      needsRefresh: hasTasteSignals && (!state || Date.now() - state.refreshedAt.getTime() >= refreshIntervalMs),
      canRefresh: hasTasteSignals,
    };
  }

  async invalidate(userId: string) {
    await this.repository.invalidateRefresh(userId);
  }

  async setFeedback(userId: string, recommendationId: string, feedback: "moreLikeThis" | "notInterested" | null) {
    await this.repository.setFeedback(userId, recommendationId, feedback);
  }

  async clear(userId: string) {
    await this.repository.clearRecommendations(userId);
  }

  async refreshAiProfile(userId: string, locale: string) {
    if (!this.aiEnhancement) throw new Error("AI is unavailable");
    return this.aiEnhancement.refreshProfile(userId, locale, await this.loadProfileSignals(userId));
  }

  async refreshDue() {
    const due = await this.repository.getDueRefreshes(new Date(Date.now() - refreshIntervalMs));
    const results = await Promise.allSettled(due.map((state) => this.startRefresh(state.userId, state.locale, true)));
    if (results.some((result) => result.status === "rejected")) throw new Error("One or more recommendation profiles could not be refreshed");
  }

  private async loadSignals(userId: string, locale: string, runId?: string): Promise<RecommendationSignal[]> {
    const rows = await this.repository.getSignals(userId);
    const usable = rows.filter((row): row is typeof row & { tmdbId: number; type: TmdbMediaType } => row.tmdbId !== null && (row.type === "movie" || row.type === "series"));
    if (runId) await this.repository.updateRun(runId, { phase: "signals", processedItems: 0, totalItems: usable.length });
    const resolved: Array<RecommendationSignal | undefined> = [];
    let resolvedCount = 0;
    for (let offset = 0; offset < usable.length; offset += 5) {
      const batch = await Promise.all(usable.slice(offset, offset + 5).map(async (row) => {
        try {
          const title = await this.metadataService.getTitleMetadata(row.type, row.tmdbId, locale);
          return { tmdbId: row.tmdbId, type: row.type, title: row.title, rating: row.rating, tags: row.tags ?? [], ...(row.feedback ? { feedback: row.feedback } : {}), played: row.played, playedPercentage: row.playedPercentage, excluded: row.excluded ?? false, feedbackUpdatedAt: row.feedbackUpdatedAt, lastPlayedAt: row.lastPlayedAt, genres: title.genres } satisfies RecommendationSignal;
        } catch {
          return undefined;
        }
      }));
      resolved.push(...batch);
      resolvedCount += batch.filter(Boolean).length;
      if (runId) await this.repository.updateRun(runId, { processedItems: resolvedCount });
    }
    if (usable.length > 0 && resolvedCount === 0) throw new Error("TMDB metadata could not be resolved for the recommendation signals");
    const positiveFeedback = await this.repository.getPositiveFeedback(userId);
    const feedbackSignals = positiveFeedback.flatMap((row): RecommendationSignal[] => row.type === "movie" || row.type === "series" ? [{ tmdbId: row.tmdbId, type: row.type, title: row.title, rating: 5, tags: [], played: false, playedPercentage: null, excluded: false, genres: row.genreIds.map((id) => ({ id, name: "" })), excludeCandidate: false }] : []);
    return [...resolved.filter((signal): signal is RecommendationSignal => Boolean(signal)), ...feedbackSignals];
  }

  private async loadProfileSignals(userId: string): Promise<RecommendationSignal[]> {
    const rows = await this.repository.getSignals(userId);
    return rows.flatMap((row): RecommendationSignal[] => row.tmdbId !== null && (row.type === "movie" || row.type === "series") ? [{
      tmdbId: row.tmdbId,
      type: row.type,
      title: row.title,
      rating: row.rating,
      tags: row.tags ?? [],
      ...(row.feedback ? { feedback: row.feedback } : {}),
      played: row.played,
      playedPercentage: row.playedPercentage,
      excluded: row.excluded ?? false,
      feedbackUpdatedAt: row.feedbackUpdatedAt,
      lastPlayedAt: row.lastPlayedAt,
      genres: [],
    }] : []);
  }

  private async withAvailability(userId: string, items: Awaited<ReturnType<RecommendationRepository["getRecommendations"]>>) {
    const titles: Array<{ id: number; type: "movie" | "series" }> = items.flatMap((item) => item.mediaType === "movie" || item.mediaType === "series" ? [{ id: item.tmdbId, type: item.mediaType }] : []);
    const [libraryAvailability, m3uAvailable, strmPending] = await Promise.all([this.metadataService.getLibraryAvailability(userId, titles), this.metadataService.getM3uAvailability(userId, titles), this.metadataService.getPendingStrmTitles(titles)]);
    return items.map((item) => ({ ...item, available: libraryAvailability.available.has(`${item.mediaType}:${item.tmdbId}`), strmAvailable: libraryAvailability.strmAvailable.has(`${item.mediaType}:${item.tmdbId}`), strmPending: m3uAvailable.has(`${item.mediaType}:${item.tmdbId}`) && strmPending.has(`${item.mediaType}:${item.tmdbId}`), m3uAvailable: m3uAvailable.has(`${item.mediaType}:${item.tmdbId}`) }));
  }
}

function fingerprintSignals(signals: RecommendationSignal[]) {
  const stable = signals.map((signal) => ({ ...signal, genres: signal.genres.map((genre) => genre.id).sort((a, b) => a - b) })).sort((a, b) => `${a.type}:${a.tmdbId}`.localeCompare(`${b.type}:${b.tmdbId}`));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function deduplicateCandidates<T extends { id: number; type: string }>(items: T[]) {
  return [...new Map(items.map((item) => [`${item.type}:${item.id}`, item])).values()];
}

function isLiked(signal: RecommendationSignal) {
  if ((signal.rating ?? 0) >= 4) return true;
  if (signal.rating !== null && signal.rating < 3) return false;
  return (signal.tags ?? []).some((tag) => positiveTags.has(tag));
}

export function selectSimilaritySeeds(signals: RecommendationSignal[], limit = 8) {
  const eligible = signals.filter((signal) => !signal.excluded && (isLiked(signal) || (signal.rating === null && signal.played)));
  const perTypeLimit = Math.max(1, Math.floor(limit / 2));
  const selected = new Map<string, RecommendationSignal>();
  for (const type of ["movie", "series"] as const) {
    for (const signal of selectMixedSeeds(eligible.filter((item) => item.type === type), perTypeLimit)) selected.set(`${signal.type}:${signal.tmdbId}`, signal);
  }
  for (const signal of selectMixedSeeds(eligible, limit)) {
    selected.set(`${signal.type}:${signal.tmdbId}`, signal);
    if (selected.size === limit) break;
  }
  return [...selected.values()].slice(0, limit);
}

function selectMixedSeeds(eligible: RecommendationSignal[], limit: number) {
  const highestRated = eligible.filter((signal) => signal.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || timestamp(b.feedbackUpdatedAt) - timestamp(a.feedbackUpdatedAt));
  const newlyRated = eligible.filter((signal) => signal.rating !== null).sort((a, b) => timestamp(b.feedbackUpdatedAt) - timestamp(a.feedbackUpdatedAt) || (b.rating ?? 0) - (a.rating ?? 0));
  const recentlyWatched = eligible.filter((signal) => signal.rating === null && signal.played).sort((a, b) => timestamp(b.lastPlayedAt) - timestamp(a.lastPlayedAt));
  const selected = new Map<string, RecommendationSignal>();
  const buckets = [highestRated, newlyRated, recentlyWatched];
  for (let index = 0; selected.size < limit && buckets.some((bucket) => index < bucket.length); index += 1) {
    for (const bucket of buckets) {
      const signal = bucket[index];
      if (signal) selected.set(`${signal.type}:${signal.tmdbId}`, signal);
      if (selected.size === limit) break;
    }
  }
  return [...selected.values()];
}

function timestamp(value?: Date | null) { return value?.getTime() ?? 0; }
