import { describe, expect, it, vi } from "vitest";
import { TmdbClient } from "./client";

describe("TmdbClient", () => {
  it("maps and orders the season summaries returned for a series", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1396,
          name: "Breaking Bad",
          original_name: "Breaking Bad",
          overview: "A teacher turns to crime.",
          genres: [],
          vote_average: 9.5,
          vote_count: 100,
          production_countries: [],
          networks: [],
          number_of_seasons: 2,
          number_of_episodes: 10,
          seasons: [
            { season_number: 1, name: "Season 1", overview: "The beginning.", episode_count: 7, air_date: "2008-01-20" },
            { season_number: 0, name: "Specials", overview: "", episode_count: 3, poster_path: "/specials.jpg" },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getTitle("token", "series", 1396, "en-US")).resolves.toMatchObject({
      seasons: 2,
      episodes: 10,
      seasonDetails: [
        { number: 0, name: "Specials", episodeCount: 3, posterPath: "/specials.jpg" },
        {
          number: 1,
          name: "Season 1",
          overview: "The beginning.",
          episodeCount: 7,
          airDate: "2008-01-20",
        },
      ],
    });
  });
});
