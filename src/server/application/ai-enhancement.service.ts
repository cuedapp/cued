import { createHash } from "node:crypto";
import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiRerankedCandidate, AiTasteSignal, TasteProfile } from "@/server/integrations/ai/provider";
import type { AiIntegrationService } from "./ai-integration.service";
import type { RecommendationSignal, ScoredRecommendation } from "./recommendation-scoring";
import { logger } from "@/lib/logger";

const cacheTtlMs = 30 * 24 * 60 * 60 * 1_000;

export class AiEnhancementService {
  constructor(private readonly repository: AiRepository, private readonly integration: AiIntegrationService) {}

  getRefreshDelayMinutes() { return this.integration.getRefreshDelayMinutes(); }

  async enhance(userId: string, locale: string, signals: RecommendationSignal[], candidates: ScoredRecommendation[]) {
    const connection = await this.integration.getConnection();
    if (!connection || candidates.length === 0) return candidates;
    try {
      const startedAt = Date.now();
      const { profile } = await this.getProfile(userId, locale, signals, false);
      const shortlistSize = connection.mode === "conservative" ? 8 : connection.mode === "enhanced" ? 20 : 12;
      const shortlist = selectBalancedShortlist(candidates, shortlistSize);
      const cacheKey = rerankFingerprint(createHash("sha256").update(JSON.stringify(profile)).digest("hex"), connection.model, locale, shortlist);
      let reranked = await this.repository.getCached<{ recommendations: AiRerankedCandidate[] }>(connection.providerId, cacheKey);
      if (!reranked) {
        logger.info("AI recommendation reranking started", { userId, model: connection.model, mode: connection.mode, candidateCount: shortlist.length });
        const recommendations = await this.integration.execute((provider, apiKey, model) => provider.rerank(apiKey, model, locale, profile, shortlist.map((item) => ({ id: item.id, type: item.type, title: item.title, overview: item.overview.slice(0, 600), genres: item.reasons, deterministicMatch: item.matchPercent }))));
        reranked = { recommendations };
        await this.repository.setCached(connection.providerId, cacheKey, reranked, cacheTtlMs);
      } else {
        logger.info("AI recommendation reranking cache hit", { userId, model: connection.model, candidateCount: shortlist.length });
      }
      const byTitle = new Map(reranked.recommendations.map((item) => [`${item.type}:${item.id}`, { ...item, score: normalizeAiScore(item.score) }]));
      const influence = connection.mode === "conservative" ? 0.15 : connection.mode === "enhanced" ? 0.35 : 0.25;
      const enhanced = candidates.map((candidate) => {
        const ai = byTitle.get(`${candidate.type}:${candidate.id}`);
        if (!ai) return candidate;
        return { ...candidate, aiScore: ai.score, aiExplanation: ai.explanation, matchPercent: Math.round(candidate.matchPercent * (1 - influence) + ai.score * influence), score: candidate.score + ai.score * influence };
      }).sort(compareRecommendations);
      logger.info("AI recommendation enhancement completed", { userId, model: connection.model, mode: connection.mode, candidateCount: shortlist.length, durationMs: Date.now() - startedAt });
      return enhanced;
    } catch (error) {
      logger.warn("AI recommendation enhancement failed; deterministic fallback used", { userId, model: connection.model, mode: connection.mode, error: error instanceof Error ? error.message : "Unknown error" });
      return candidates;
    }
  }

  async refreshProfile(userId: string, locale: string, signals: RecommendationSignal[]) { return this.getProfile(userId, locale, signals, true); }

  private async getProfile(userId: string, locale: string, signals: RecommendationSignal[], force: boolean): Promise<{ profile: TasteProfile; fingerprint: string }> {
    const connection = await this.integration.getConnection();
    if (!connection) throw new Error("AI is disabled");
    const aiSignals: AiTasteSignal[] = signals.map((signal) => ({ title: signal.title ?? "Untitled", type: signal.type, rating: signal.rating, tags: signal.tags ?? [], ...(signal.feedback ? { feedback: signal.feedback } : {}), watched: signal.played }));
    const fingerprint = createHash("sha256").update(JSON.stringify({ locale, aiSignals })).digest("hex");
    const existing = await this.repository.getProfile(userId);
    if (!force && existing?.signalFingerprint === fingerprint && existing.provider === connection.providerId && existing.model === connection.model) {
      logger.info("AI taste profile cache hit", { userId, model: connection.model, signalCount: aiSignals.length });
      return { profile: existing.profile as unknown as TasteProfile, fingerprint };
    }
    const startedAt = Date.now();
    logger.info("AI taste profile generation started", { userId, model: connection.model, signalCount: aiSignals.length, forced: force });
    const profile = await this.integration.execute((provider, apiKey, model) => provider.generateTasteProfile(apiKey, model, locale, aiSignals));
    await this.repository.saveProfile(userId, fingerprint, connection.providerId, connection.model, profile, aiSignals.length);
    logger.info("AI taste profile generation completed", { userId, model: connection.model, signalCount: aiSignals.length, traitCount: profile.traits.length, dislikeCount: profile.dislikes.length, durationMs: Date.now() - startedAt });
    return { profile, fingerprint };
  }
}

function rerankFingerprint(profileFingerprint: string, model: string, locale: string, candidates: ScoredRecommendation[]) {
  return `rerank:${createHash("sha256").update(JSON.stringify({ version: 2, profileFingerprint, model, locale, candidates: candidates.map((item) => [item.type, item.id, item.matchPercent]) })).digest("hex")}`;
}

function normalizeAiScore(score: number) {
  return Math.max(0, Math.min(100, score >= 0 && score <= 1 ? score * 100 : score));
}

function selectBalancedShortlist(candidates: ScoredRecommendation[], limit: number) {
  const perType = Math.floor(limit / 2);
  const selected = [
    ...candidates.filter((candidate) => candidate.type === "movie").slice(0, perType),
    ...candidates.filter((candidate) => candidate.type === "series").slice(0, perType),
  ];
  const selectedKeys = new Set(selected.map((candidate) => `${candidate.type}:${candidate.id}`));
  selected.push(...candidates.filter((candidate) => !selectedKeys.has(`${candidate.type}:${candidate.id}`)).slice(0, limit - selected.length));
  return selected.toSorted((a, b) => candidates.indexOf(a) - candidates.indexOf(b));
}

function compareRecommendations(a: ScoredRecommendation, b: ScoredRecommendation) {
  const tier = (item: ScoredRecommendation) => item.sourceTitles.length > 0 ? 2 : item.aiScore !== undefined ? 1 : 0;
  return tier(b) - tier(a) || b.matchPercent - a.matchPercent || b.score - a.score;
}
