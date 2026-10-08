import { describe, expect, it, vi } from "vitest";
import { TmdbClient } from "./client";

describe("TmdbClient", () => {
  it("uses the requested country's movie certification and normalizes its age", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          title: "Example",
          original_title: "Example",
          overview: "",
          genres: [],
          production_countries: [],
          networks: [],
          release_dates: {
            results: [
              { iso_3166_1: "US", release_dates: [{ certification: "PG-13", type: 3 }] },
              { iso_3166_1: "SE", release_dates: [{ certification: "11", type: 3 }] },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getTitle("token", "movie", 1, "sv-SE")).resolves.toMatchObject({
      contentRating: "11",
      contentRatingAge: 11,
    });
  });

  it("falls back to the US series certification when the requested country is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 2,
          name: "Example",
          original_name: "Example",
          overview: "",
          genres: [],
          production_countries: [],
          networks: [],
          content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }] },
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getTitle("token", "series", 2, "nl-NL")).resolves.toMatchObject({
      contentRating: "TV-MA",
      contentRatingAge: 18,
    });
  });

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
            {
              season_number: 1,
              name: "Season 1",
              overview: "The beginning.",
              episode_count: 7,
              air_date: "2008-01-20",
            },
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
            {
              id: 2,
              title: "Second",
              release_date: "2002-01-01",
              genre_ids: [],
              vote_average: 7,
              vote_count: 10,
              popularity: 2,
            },
            {
              id: 1,
              title: "First",
              release_date: "2001-01-01",
              genre_ids: [],
              vote_average: 8,
              vote_count: 20,
              popularity: 1,
            },
            {
              id: 3,
              title: "Undated",
              genre_ids: [],
              vote_average: 0,
              vote_count: 0,
              popularity: 3,
            },
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
        { id: 3, type: "movie", title: "Undated" },
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

  it("maps the episodes of a requested season", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          season_number: 2,
          name: "Season 2",
          episodes: [
            { id: 200, episode_number: 1, name: "Return", overview: "The story continues.", air_date: "2025-01-01" },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(new TmdbClient(fetchMock).getSeason("token", 100, 2, "en-US")).resolves.toEqual({
      seriesId: 100,
      seasonNumber: 2,
      name: "Season 2",
      episodes: [{ id: 200, number: 1, name: "Return", overview: "The story continues.", airDate: "2025-01-01" }],
    });
  });
  it("searches seasonal keywords and discovers titles with the selected keyword", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ id: 12, name: "Halloween" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            page: 1,
            total_pages: 1,
            results: [{ id: 20, title: "Seasonal title", overview: "", release_date: "2025-10-01", popularity: 9 }],
          }),
          { status: 200 },
        ),
      );
    const client = new TmdbClient(fetchMock);

    await expect(client.searchKeywords("token", "Halloween")).resolves.toEqual([{ id: 12, name: "Halloween" }]);
    await expect(client.discoverByKeyword("token", "movie", 12, "en-US")).resolves.toMatchObject({
      page: 1,
      totalPages: 1,
      results: [{ id: 20, type: "movie", title: "Seasonal title", date: "2025-10-01", popularity: 9 }],
    });

    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("with_keywords=12");
  });

  it.each([
    ["movie", "keywords"],
    ["series", "results"],
  ] as const)("reads %s keyword membership from its provider response", async (type, field) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 42, [field]: [{ id: 12, name: "Halloween" }] }), { status: 200 }),
      );
    const result = await new TmdbClient(fetchMock).getKeywords("token", type, 42);
    expect(result).toEqual([{ id: 12, name: "Halloween" }]);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe(`/3/${type === "series" ? "tv" : "movie"}/42/keywords`);
  });

  it.each([
    ["movie", "primary_release_date", "release_date"],
    ["series", "first_air_date", "first_air_date"],
  ] as const)(
    "discovers low-vote upcoming %s titles for one keyword from a precise date",
    async (type, field, dateField) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            page: 2,
            total_pages: 4,
            results: [{ id: 42, title: "Premiere", [dateField]: "2026-10-02", vote_count: 0 }],
          }),
          { status: 200 },
        ),
      );
      const result = await new TmdbClient(fetchMock).discoverByKeyword("token", type, 12, "en-US", 2, "2026-10-02");
      expect(result).toMatchObject({ page: 2, totalPages: 4, results: [{ id: 42, date: "2026-10-02", voteCount: 0 }] });
      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.pathname).toBe(`/3/discover/${type === "series" ? "tv" : "movie"}`);
      expect(url.searchParams.get("with_keywords")).toBe("12");
      expect(url.searchParams.get(`${field}.gte`)).toBe("2026-10-02");
      expect(url.searchParams.get("sort_by")).toBe(`${field}.asc`);
      expect(url.searchParams.has("vote_count.gte")).toBe(false);
    },
  );

  it.each(["movie", "series"] as const)("loads localized %s genre catalogues", async (type) => {
    const transport = vi.fn<typeof fetch>(async () =>
      Response.json({
        genres: [
          { id: 27, name: "Skräck" },
          { id: 35, name: "Komedi" },
        ],
      }),
    );
    expect(await new TmdbClient(transport).getGenres("token", type, "sv-SE")).toEqual([
      { id: 27, name: "Skräck" },
      { id: 35, name: "Komedi" },
    ]);
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.pathname).toBe(type === "movie" ? "/3/genre/movie/list" : "/3/genre/tv/list");
    expect(url.searchParams.get("language")).toBe("sv-SE");
  });

  it.each([
    { genres: [{ id: 0, name: "Horror" }] },
    { genres: [{ id: 27.5, name: "Horror" }] },
    { genres: [{ id: 27, name: "" }] },
    { results: [{ id: 27, name: "Horror" }] },
  ])("rejects malformed genre catalogues %j", async (payload) => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(payload));
    await expect(new TmdbClient(transport).getGenres("token", "movie", "en-US")).rejects.toThrow();
  });

  it.each(["movie", "series"] as const)(
    "uses %s release fields and explicit filters for keyword-discovery paging",
    async (type) => {
      const transport = vi.fn<typeof fetch>(async () =>
        Response.json({
          page: 3,
          total_pages: 5,
          results: [{ id: 1, title: "A title", name: "A title", vote_average: 8, genre_ids: [27], vote_count: 30 }],
        }),
      );
      const client = new TmdbClient(transport);
      const releaseField = type === "movie" ? "primary_release_date" : "first_air_date";
      const expectations = [
        ["feed", "popularity.desc"],
        ["popularity", "popularity.desc"],
        ["rating", "vote_average.desc"],
        ["releaseAsc", releaseField + ".asc"],
        ["releaseDesc", releaseField + ".desc"],
      ] as const;
      for (const [sort, expectedSort] of expectations) {
        await client.discoverByKeyword("token", type, 12, "nl-NL", 3, undefined, {
          genreId: 27,
          minimumRating: 8,
          sort,
        });
        const url = new URL(String(transport.mock.lastCall![0]));
        expect(url.searchParams.get("sort_by")).toBe(expectedSort);
        expect(url.searchParams.get("with_genres")).toBe("27");
        expect(url.searchParams.get("vote_average.gte")).toBe("8");
        expect(url.searchParams.get("vote_count.gte")).toBe("20");
        expect(url.searchParams.get("page")).toBe("3");
        expect(url.searchParams.get("language")).toBe("nl-NL");
        expect(url.searchParams.get("with_keywords")).toBe("12");
      }
      await client.discoverByKeyword("token", type, 12, "nl-NL", 3, "2026-10-02", { genreId: 27, sort: "rating" });
      let url = new URL(String(transport.mock.lastCall![0]));
      expect(url.searchParams.get("sort_by")).toBe("vote_average.desc");
      expect(url.searchParams.get(releaseField + ".gte")).toBe("2026-10-02");
      expect(url.searchParams.has("vote_count.gte")).toBe(false);
      await client.discoverByKeyword("token", type, 12, "nl-NL", 3, "2026-10-02", {
        minimumRating: 8,
        sort: "releaseDesc",
      });
      url = new URL(String(transport.mock.lastCall![0]));
      expect(url.searchParams.get("sort_by")).toBe(releaseField + ".desc");
      expect(url.searchParams.get("vote_count.gte")).toBe("20");
      expect(url.searchParams.get("vote_average.gte")).toBe("8");
    },
  );
});
