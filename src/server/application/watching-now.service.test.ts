import { describe, expect, it } from "vitest";
import { WatchingNowService } from "./watching-now.service";

const session = {
  id: "session-1",
  userId: "jellyfin-1",
  itemId: "item-1",
  itemName: "A movie",
  itemKind: "movie" as const,
  positionTicks: "500",
  runtimeTicks: "1000",
};

describe("WatchingNowService", () => {
  it("only returns another user's imported playback when shared visibility is enabled", async () => {
    const service = new WatchingNowService(
      { getActiveSessions: async () => [session] } as never,
      {
        getUsers: async () => [
          { id: "cued-1", jellyfinUserId: "jellyfin-1", displayName: "Luka", primaryImageTag: null },
        ],
        getMedia: async () => [
          {
            jellyfinItemId: "item-1",
            name: "A movie",
            kind: "movie",
            tmdbId: 1,
            seriesTmdbId: null,
            seriesName: null,
            contentRatingAge: 12,
            seriesContentRatingAge: null,
          },
        ],
      } as never,
    );

    await expect(
      service.getForViewer({ id: "cued-2", role: "user", maximumContentRatingAge: null }, false),
    ).resolves.toEqual([]);
    await expect(
      service.getForViewer({ id: "cued-2", role: "user", maximumContentRatingAge: null }, true),
    ).resolves.toMatchObject([{ displayName: "Luka", title: "A movie", progress: 50 }]);
  });

  it("does not expose playback above the viewer's content limit", async () => {
    const service = new WatchingNowService(
      { getActiveSessions: async () => [session] } as never,
      {
        getUsers: async () => [
          { id: "cued-1", jellyfinUserId: "jellyfin-1", displayName: "Luka", primaryImageTag: null },
        ],
        getMedia: async () => [
          {
            jellyfinItemId: "item-1",
            name: "A movie",
            kind: "movie",
            tmdbId: 1,
            seriesTmdbId: null,
            seriesName: null,
            contentRatingAge: 18,
            seriesContentRatingAge: null,
          },
        ],
      } as never,
    );

    await expect(
      service.getForViewer({ id: "cued-1", role: "user", maximumContentRatingAge: 12 }, true),
    ).resolves.toEqual([]);
  });
});
