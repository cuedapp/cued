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

  it("maps collection movies in release order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 10,
          name: "Example collection",
          overview: "Related films.",
          parts: [
            { id: 2, title: "Second", release_date: "2002-01-01", genre_ids: [], vote_average: 7, vote_count: 10, popularity: 2 },
            { id: 1, title: "First", release_date: "2001-01-01", genre_ids: [], vote_average: 8, vote_count: 20, popularity: 1 },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getCollection("token", 10, "en-US")).resolves.toMatchObject({
      id: 10,
      name: "Example collection",
      parts: [
        { id: 1, type: "movie", title: "First" },
        { id: 2, type: "movie", title: "Second" },
      ],
    });
  });

  it("keeps cast and crew role kinds when combining person credits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          name: "Example person",
          biography: "",
          combined_credits: {
            cast: [{ id: 10, media_type: "movie", title: "Example", character: "Hero" }],
            crew: [{ id: 10, media_type: "movie", title: "Example", job: "Producer" }],
          },
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getPerson("token", 1, "en-US")).resolves.toMatchObject({
      credits: [{ id: 10, role: "Hero · Producer", roleKinds: ["cast", "crew"] }],
    });
  });
});
