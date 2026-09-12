import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiIntegrationService } from "./ai-integration.service";
import type { RecommendationService } from "./recommendation.service";
import type { TasteProfile } from "@/server/integrations/ai/provider";
import type { TmdbMetadataService } from "./tmdb-metadata.service";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import { defaultOriginalLanguages, isOriginalLanguageCode } from "@/lib/original-languages";

export class AiConversationService {
  constructor(
    private readonly repository: AiRepository,
    private readonly integration: AiIntegrationService,
    private readonly recommendations: RecommendationService,
    private readonly metadata?: TmdbMetadataService,
    private readonly tmdbRepository?: TmdbRepository,
  ) {}

  async getStatus(userId: string) {
    const [access, used, connection] = await Promise.all([
      this.repository.getChatAccess(userId),
      this.repository.getChatUsage(userId),
      this.integration.getConnection(),
    ]);
    const limit = access?.aiChatDailyLimit ?? 5;
    return {
      enabled: Boolean(access?.aiChatEnabled && connection),
      configured: Boolean(connection),
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }

  async getHistory(userId: string) {
    const rows = await this.repository.getConversations(userId);
    return rows.map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      scope: row.scope as "catalogue" | "explore",
      recommendations: row.recommendations,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async ask(userId: string, locale: string, question: string, scope: "catalogue" | "explore" = "catalogue") {
    const access = await this.repository.getChatAccess(userId);
    if (!access?.aiChatEnabled) throw new AiConversationError("disabled", 403);
    if (!(await this.integration.getConnection())) throw new AiConversationError("unconfigured", 503);
    const [profileRow, catalogueItems] = await Promise.all([
      this.repository.getProfile(userId),
      this.recommendations.getAll(userId, locale),
    ]);
    const items =
      scope === "explore" && this.metadata && this.tmdbRepository
        ? await this.getDiscoveryItems(userId, locale, catalogueItems)
        : catalogueItems;
    const candidates = items.slice(0, 60).map((item) => ({
      id: item.tmdbId,
      type: item.mediaType as "movie" | "series",
      title: item.title,
      overview: item.overview,
      genres: item.reasons,
      deterministicMatch: item.matchPercent,
    }));
    if (candidates.length === 0) throw new AiConversationError("empty", 409);
    const claimed = await this.repository.claimChatRequest(userId, access.aiChatDailyLimit);
    if (!claimed) throw new AiConversationError("limit", 429);
    const profile = isTasteProfile(profileRow?.profile) ? profileRow.profile : undefined;
    const result = await this.integration.execute((provider, apiKey, model) =>
      provider.answerRecommendationQuestion(apiKey, model, locale, question, profile, candidates),
    );
    const byKey = new Map(items.map((item) => [`${item.mediaType}:${item.tmdbId}`, item]));
    const recommendations = result.recommendations.flatMap((recommendation) => {
      const item = byKey.get(`${recommendation.type}:${recommendation.id}`);
      return item ? [{ ...item, explanation: recommendation.explanation }] : [];
    });
    const conversation = await this.repository.saveConversation(
      userId,
      question,
      result.answer,
      scope,
      recommendations as Array<Record<string, unknown>>,
    );
    return {
      id: conversation.id,
      question,
      scope,
      answer: result.answer,
      recommendations,
      createdAt: conversation.createdAt.toISOString(),
      remaining: Math.max(0, access.aiChatDailyLimit - claimed),
    };
  }

  private async getDiscoveryItems(
    userId: string,
    locale: string,
    catalogueItems: Array<{ tmdbId: number; mediaType: string }>,
  ) {
    const [page, savedLanguages] = await Promise.all([
      this.metadata!.getPopularForUser(userId, locale),
      this.tmdbRepository!.getPreferredOriginalLanguages(userId),
    ]);
    const languages = new Set<string>(
      (savedLanguages?.length
        ? savedLanguages
        : defaultOriginalLanguages(locale as "en" | "sv" | "nl")
      ).filter(isOriginalLanguageCode),
    );
    const catalogueKeys = new Set(catalogueItems.map((item) => `${item.mediaType}:${item.tmdbId}`));
    return page.results
      .filter(
        (item) =>
          !item.restricted &&
          !item.available &&
          !item.watched &&
          !item.partiallyWatched &&
          !catalogueKeys.has(`${item.type}:${item.id}`) &&
          (!item.originalLanguage || languages.has(item.originalLanguage)),
      )
      .map((item) => ({
        id: `${item.type}:${item.id}`,
        tmdbId: item.id,
        mediaType: item.type,
        title: item.title,
        overview: item.overview,
        posterPath: item.posterPath ?? null,
        releaseDate: item.date ?? null,
        matchPercent: 0,
        rating: item.rating,
        reasons: item.genres.map((genre) => genre.name),
        aiExplanation: null,
        contentRatingAge: item.contentRatingAge,
        available: item.available,
        watched: item.watched,
        partiallyWatched: item.partiallyWatched,
        strmAvailable: item.strmAvailable,
        strmPending: item.strmPending,
        m3uAvailable: item.m3uAvailable,
      }));
  }
}

export class AiConversationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

function isTasteProfile(value: unknown): value is TasteProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<TasteProfile>;
  return typeof profile.summary === "string" && Array.isArray(profile.traits) && Array.isArray(profile.dislikes);
}
