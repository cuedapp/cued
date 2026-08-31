import { describe, expect, it, vi } from "vitest";
import { AiEnhancementService } from "@/server/application/ai-enhancement.service";
import type { AiIntegrationService } from "@/server/application/ai-integration.service";
import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { ScoredRecommendation } from "@/server/application/recommendation-scoring";
import type { AiProvider } from "@/server/integrations/ai/provider";

const candidate: ScoredRecommendation = { id: 10, type: "movie", title: "Candidate", overview: "Story", genreIds: [18], rating: 7, voteCount: 100, popularity: 10, score: 70, matchPercent: 70, reasons: ["Drama"], sourceTitles: [] };
const signals = [{ tmdbId: 1, type: "movie" as const, title: "Liked", rating: 5, tags: ["smart"], played: true, playedPercentage: 100, excluded: false, genres: [{ id: 18, name: "Drama" }] }];

describe("AiEnhancementService", () => {
  it("leaves deterministic recommendations untouched when AI is disabled", async () => {
    const integration = { getConnection: vi.fn().mockResolvedValue(undefined) } as unknown as AiIntegrationService;
    await expect(new AiEnhancementService({} as AiRepository, integration).enhance("user", "en", signals, [candidate])).resolves.toEqual([candidate]);
  });

  it("caches profile-aware reranking and blends it without replacing deterministic scoring", async () => {
    const provider = { testConnection: vi.fn(), generateTasteProfile: vi.fn().mockResolvedValue({ summary: "Profile", traits: ["Drama"], dislikes: [] }), rerank: vi.fn().mockResolvedValue([{ id: 10, type: "movie", score: 90, explanation: "Matches your preference for focused drama." }]) };
    const integration = { getConnection: vi.fn().mockResolvedValue({ providerId: "openai", apiKey: "key", model: "gpt-5-mini", mode: "balanced" }), execute: (operation: (provider: AiProvider, apiKey: string, model: string) => Promise<unknown>) => operation(provider as unknown as AiProvider, "key", "gpt-5-mini") } as unknown as AiIntegrationService;
    let cached: { recommendations: Array<{ id: number; type: "movie"; score: number; explanation: string }> } | undefined;
    const repository = { getProfile: vi.fn().mockResolvedValue(undefined), saveProfile: vi.fn(), getCached: vi.fn(() => Promise.resolve(cached)), setCached: vi.fn((_provider, _key, value) => { cached = value; }) } as unknown as AiRepository;
    const service = new AiEnhancementService(repository, integration);
    const first = await service.enhance("user", "en", signals, [candidate]);
    const second = await service.enhance("user", "en", signals, [candidate]);
    expect(first[0]).toMatchObject({ aiScore: 90, aiExplanation: "Matches your preference for focused drama." });
    expect(first[0]!.matchPercent).toBeGreaterThan(candidate.matchPercent);
    expect(second).toEqual(first);
    expect(provider.rerank).toHaveBeenCalledOnce();
  });

  it("normalizes fractional AI scores to the documented 0-100 scale", async () => {
    const provider = { generateTasteProfile: vi.fn().mockResolvedValue({ summary: "Profile", traits: [], dislikes: [] }), rerank: vi.fn().mockResolvedValue([{ id: 10, type: "movie", score: 0.88, explanation: "Strong match." }]) };
    const integration = { getConnection: vi.fn().mockResolvedValue({ providerId: "openai", apiKey: "key", model: "gpt-5.6-luna", mode: "balanced" }), execute: (operation: (provider: AiProvider, apiKey: string, model: string) => Promise<unknown>) => operation(provider as unknown as AiProvider, "key", "gpt-5.6-luna") } as unknown as AiIntegrationService;
    const repository = { getProfile: vi.fn().mockResolvedValue(undefined), saveProfile: vi.fn(), getCached: vi.fn().mockResolvedValue(undefined), setCached: vi.fn() } as unknown as AiRepository;
    const [result] = await new AiEnhancementService(repository, integration).enhance("user", "en", signals, [candidate]);
    expect(result).toMatchObject({ aiScore: 88, matchPercent: 75 });
  });

  it("reserves AI shortlist capacity for both movies and series", async () => {
    const candidates = Array.from({ length: 12 }, (_, index): ScoredRecommendation => ({ ...candidate, id: index + 1, type: index < 10 ? "movie" : "series" }));
    const provider = { generateTasteProfile: vi.fn().mockResolvedValue({ summary: "Profile", traits: [], dislikes: [] }), rerank: vi.fn().mockImplementation((_key, _model, _locale, _profile, shortlist) => Promise.resolve(shortlist.map((item: { id: number; type: "movie" | "series" }) => ({ ...item, score: 80, explanation: "Match." })))) };
    const integration = { getConnection: vi.fn().mockResolvedValue({ providerId: "openai", apiKey: "key", model: "gpt-5.6-luna", mode: "balanced" }), execute: (operation: (provider: AiProvider, apiKey: string, model: string) => Promise<unknown>) => operation(provider as unknown as AiProvider, "key", "gpt-5.6-luna") } as unknown as AiIntegrationService;
    const repository = { getProfile: vi.fn().mockResolvedValue(undefined), saveProfile: vi.fn(), getCached: vi.fn().mockResolvedValue(undefined), setCached: vi.fn() } as unknown as AiRepository;
    await new AiEnhancementService(repository, integration).enhance("user", "en", signals, candidates);
    const shortlist = provider.rerank.mock.calls[0]?.[4] as Array<{ type: string }>;
    expect(shortlist.some((item) => item.type === "movie")).toBe(true);
    expect(shortlist.some((item) => item.type === "series")).toBe(true);
  });
});
