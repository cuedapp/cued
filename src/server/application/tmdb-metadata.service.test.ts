import { describe, expect, it, vi } from "vitest";
import { TmdbMetadataService } from "./tmdb-metadata.service";

describe("TmdbMetadataService", () => {
  it("re-sorts cached collection parts so undated titles come last", async () => {
    const repository = {
      getCached: vi.fn().mockResolvedValue({
        id: 10,
        name: "Example collection",
        overview: "",
        parts: [
          { id: 3, type: "movie", title: "Undated" },
          { id: 2, type: "movie", title: "Second", date: "2002-01-01" },
          { id: 1, type: "movie", title: "First", date: "2001-01-01" },
        ],
      }),
      getAvailableTitles: vi.fn().mockResolvedValue({
        available: new Set<string>(),
        strmAvailable: new Set<string>(),
        watched: new Set<string>(),
        partiallyWatched: new Set<string>(),
      }),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
    };
    const service = new TmdbMetadataService(repository as never, {} as never, {} as never);
    vi.spyOn(service, "getTitleMetadata").mockResolvedValue({
      type: "movie",
      contentRatingAge: null,
      genres: [],
    } as never);

    const collection = await service.getCollectionForUser("user-1", 10, "en");

    expect(collection.parts.map((part) => part.title)).toEqual(["First", "Second", "Undated"]);
  });
});
