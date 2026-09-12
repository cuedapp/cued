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
    expect(result.remaining).toBe(4);
  });
});
