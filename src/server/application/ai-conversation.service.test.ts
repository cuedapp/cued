import { describe, expect, it, vi } from "vitest";
import { AiConversationError, AiConversationService } from "./ai-conversation.service";

describe("AiConversationService", () => {
  it("rejects users without explicit access before using the provider", async () => {
    const integration = { getConnection: vi.fn() };
    const service = new AiConversationService(
      { getChatAccess: vi.fn().mockResolvedValue({ aiChatEnabled: false, aiChatDailyLimit: 5 }) } as never,
      integration as never,
      {} as never,
    );
    await expect(service.ask("user", "en", "What should I watch?")).rejects.toEqual(
      expect.objectContaining<Partial<AiConversationError>>({ code: "disabled", status: 403 }),
    );
    expect(integration.getConnection).not.toHaveBeenCalled();
  });

  it("grounds provider selections in the user's recommendation catalogue", async () => {
    const repository = {
      getChatAccess: vi.fn().mockResolvedValue({ aiChatEnabled: true, aiChatDailyLimit: 5 }),
      claimChatRequest: vi.fn().mockResolvedValue(1),
      getProfile: vi.fn().mockResolvedValue(undefined),
      saveConversation: vi.fn().mockResolvedValue({ id: "conversation", createdAt: new Date("2026-09-12T12:00:00Z") }),
    };
    const integration = {
      getConnection: vi.fn().mockResolvedValue({}),
      execute: vi.fn(async (operation) =>
        operation(
          {
            answerRecommendationQuestion: vi.fn().mockResolvedValue({
              answer: "Try the grounded option.",
              recommendations: [
                { id: 10, type: "series", explanation: "A close match." },
                { id: 999, type: "movie", explanation: "Invented." },
              ],
            }),
          },
          "key",
          "model",
        ),
      ),
    };
    const recommendations = {
      getAll: vi.fn().mockResolvedValue([
        {
          id: "row",
          tmdbId: 10,
          mediaType: "series",
          title: "Grounded",
          overview: "",
          reasons: [],
          matchPercent: 90,
        },
      ]),
    };
    const service = new AiConversationService(repository as never, integration as never, recommendations as never);
    const result = await service.ask("user", "en", "Something like Silo");
    expect(result.recommendations).toEqual([
      expect.objectContaining({ tmdbId: 10, title: "Grounded", explanation: "A close match." }),
    ]);
    expect(repository.saveConversation).toHaveBeenCalledWith(
      "user",
      "Something like Silo",
      "Try the grounded option.",
      "catalogue",
      result.recommendations,
    );
    expect(result.remaining).toBe(4);
  });

  it("returns only the current user's saved conversation history", async () => {
    const repository = {
      getConversations: vi.fn().mockResolvedValue([
        {
          id: "conversation",
          question: "Something funny",
          answer: "Try this.",
          recommendations: [],
          createdAt: new Date("2026-09-12T12:00:00Z"),
        },
      ]),
    };
    const service = new AiConversationService(repository as never, {} as never, {} as never);
    await expect(service.getHistory("user")).resolves.toEqual([
      expect.objectContaining({ id: "conversation", question: "Something funny", createdAt: "2026-09-12T12:00:00.000Z" }),
    ]);
    expect(repository.getConversations).toHaveBeenCalledWith("user");
  });

  it("grounds broader discovery in age- and language-filtered TMDB candidates", async () => {
    const repository = {
      getChatAccess: vi.fn().mockResolvedValue({ aiChatEnabled: true, aiChatDailyLimit: 5 }),
      claimChatRequest: vi.fn().mockResolvedValue(1),
      getProfile: vi.fn().mockResolvedValue(undefined),
      saveConversation: vi.fn().mockResolvedValue({ id: "conversation", createdAt: new Date("2026-09-12T12:00:00Z") }),
    };
    const answerRecommendationQuestion = vi.fn().mockResolvedValue({
      answer: "Try the broader option.",
      recommendations: [{ id: 20, type: "movie", explanation: "Grounded beyond the catalogue." }],
    });
    const integration = {
      getConnection: vi.fn().mockResolvedValue({}),
      execute: vi.fn(async (operation) => operation({ answerRecommendationQuestion }, "key", "model")),
    };
    const metadata = {
      getPopularForUser: vi.fn().mockResolvedValue({
        results: [
          {
            id: 20,
            type: "movie",
            title: "Broader",
            overview: "Action",
            posterPath: null,
            date: "2026-01-01",
            rating: 7,
            originalLanguage: "en",
            restricted: false,
            genres: [{ id: 28, name: "Action" }],
            available: false,
            watched: false,
            partiallyWatched: false,
            strmAvailable: false,
            strmPending: false,
            m3uAvailable: false,
          },
          { id: 21, type: "movie", originalLanguage: "ja", restricted: false, genres: [] },
          { id: 22, type: "movie", originalLanguage: "en", restricted: true, genres: [] },
          { id: 23, type: "movie", originalLanguage: "en", restricted: false, genres: [] },
          {
            id: 24,
            type: "movie",
            originalLanguage: "en",
            restricted: false,
            available: false,
            watched: true,
            genres: [],
          },
          {
            id: 25,
            type: "series",
            originalLanguage: "en",
            restricted: false,
            available: false,
            partiallyWatched: true,
            genres: [],
          },
          {
            id: 26,
            type: "movie",
            originalLanguage: "en",
            restricted: false,
            available: true,
            watched: false,
            genres: [],
          },
        ],
      }),
    };
    const service = new AiConversationService(
      repository as never,
      integration as never,
      { getAll: vi.fn().mockResolvedValue([{ tmdbId: 23, mediaType: "movie" }]) } as never,
      metadata as never,
      { getPreferredOriginalLanguages: vi.fn().mockResolvedValue(["en"]) } as never,
    );
    const result = await service.ask("user", "en", "Something new", "explore");
    expect(answerRecommendationQuestion).toHaveBeenCalledWith(
      "key",
      "model",
      "en",
      "Something new",
      undefined,
      [expect.objectContaining({ id: 20, title: "Broader", genres: ["Action"] })],
    );
    expect(result.scope).toBe("explore");
  });
});
