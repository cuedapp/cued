import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiIntegrationService } from "./ai-integration.service";
import type { RecommendationService } from "./recommendation.service";
import type { TasteProfile } from "@/server/integrations/ai/provider";

export class AiConversationService {
  constructor(
    private readonly repository: AiRepository,
    private readonly integration: AiIntegrationService,
    private readonly recommendations: RecommendationService,
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

  async ask(userId: string, locale: string, question: string) {
    const access = await this.repository.getChatAccess(userId);
    if (!access?.aiChatEnabled) throw new AiConversationError("disabled", 403);
    if (!(await this.integration.getConnection())) throw new AiConversationError("unconfigured", 503);
    const [profileRow, items] = await Promise.all([
      this.repository.getProfile(userId),
      this.recommendations.getAll(userId, locale),
    ]);
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
    return {
      answer: result.answer,
      recommendations: result.recommendations.flatMap((recommendation) => {
        const item = byKey.get(`${recommendation.type}:${recommendation.id}`);
        return item ? [{ ...item, explanation: recommendation.explanation }] : [];
      }),
      remaining: Math.max(0, access.aiChatDailyLimit - claimed),
    };
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
