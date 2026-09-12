import { describe, expect, it, vi } from "vitest";
import { TmdbClient, TmdbRequestError } from "@/server/integrations/tmdb/client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("TmdbClient", () => {
  it("tests application authentication without exposing the token in the URL", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ images: { secure_base_url: "https://image.tmdb.org/t/p/" } }));
    const configuration = await new TmdbClient(transport).getConfiguration("read-token");
    expect(configuration.imageSecureBaseUrl).toBe("https://image.tmdb.org/t/p/");
    const [url, request] = transport.mock.calls[0]!;
    expect(String(url)).not.toContain("read-token");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer read-token");
  });

  it("maps localized multi-search results across movies, series and people", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        page: 1,
        total_pages: 1,
        total_results: 3,
        results: [
          {
            id: 1,
            media_type: "movie",
            title: "Filmen",
            original_title: "The Movie",
            overview: "Beskrivning",
            release_date: "2026-01-02",
            poster_path: "/movie.jpg",
            popularity: 12,
            vote_average: 7.4,
            genre_ids: [12, 28],
          },
          {
            id: 2,
            media_type: "tv",
            name: "Serien",
            original_name: "The Series",
            first_air_date: "2025-02-03",
            poster_path: "/series.jpg",
            popularity: 10,
          },
          {
            id: 3,
            media_type: "person",
            name: "Ada Actor",
            profile_path: "/person.jpg",
            known_for_department: "Acting",
            popularity: 8,
          },
        ],
      }),
    );
    const result = await new TmdbClient(transport).search("token", "sökning", "sv-SE");
    expect(result.results.map((item) => item.type)).toEqual(["movie", "series", "person"]);
    expect(result.results[0]).toMatchObject({
      title: "Filmen",
      originalTitle: "The Movie",
      rating: 7.4,
      genreIds: [12, 28],
    });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("language")).toBe("sv-SE");
    expect(url.searchParams.get("query")).toBe("sökning");
  });

  it("searches TMDB collections with localized paging", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        page: 2,
        total_pages: 4,
        total_results: 72,
        results: [
          {
            id: 2980,
            name: "Ghostbusters Collection",
            overview: "Who you gonna call?",
            poster_path: "/collection.jpg",
            backdrop_path: "/collection-backdrop.jpg",
          },
        ],
      }),
    );
    await expect(new TmdbClient(transport).searchCollections("token", "ghostbusters", "sv-SE", 2)).resolves.toEqual({
      page: 2,
      totalPages: 4,
      totalResults: 72,
      results: [
        {
          id: 2980,
          name: "Ghostbusters Collection",
          overview: "Who you gonna call?",
          posterPath: "/collection.jpg",
          backdropPath: "/collection-backdrop.jpg",
        },
      ],
    });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/3/search/collection");
    expect(url.searchParams.get("language")).toBe("sv-SE");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("loads a title with credits, external IDs and trailers in one request", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: 11,
        title: "Localized title",
        original_title: "Original title",
        overview: "Overview",
        release_date: "2026-03-04",
        runtime: 123,
        genres: [{ id: 1, name: "Drama" }],
        vote_average: 7.5,
        external_ids: { imdb_id: "tt0000011" },
        original_language: "en",
        production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
        networks: [{ id: 2552, name: "Apple TV+", logo_path: "/apple-tv.jpg" }],
        release_dates: {
          results: [
            {
              iso_3166_1: "US",
              release_dates: [{ certification: "PG-13", type: 3, release_date: "2026-04-05T00:00:00.000Z" }],
            },
          ],
        },
        credits: {
          cast: [{ id: 8, name: "Actor", character: "Lead", profile_path: "/actor.jpg" }],
          crew: [{ id: 9, name: "Director", job: "Director" }],
        },
        videos: {
          results: [{ id: "video", name: "Trailer", site: "YouTube", key: "abc123", type: "Trailer", official: true }],
        },
      }),
    );
    const result = await new TmdbClient(transport).getTitle("token", "movie", 11, "en-US");
    expect(result).toMatchObject({
      id: 11,
      runtimeMinutes: 123,
      date: "2026-04-05",
      imdbId: "tt0000011",
      originalLanguage: "en",
      productionCountries: [{ code: "US", name: "United States of America" }],
      networks: [{ id: 2552, name: "Apple TV+", logoPath: "/apple-tv.jpg" }],
      cast: [{ id: 8, role: "Lead" }],
      crew: [{ id: 9, role: "Director" }],
    });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("append_to_response")).toBe(
      "credits,videos,external_ids,release_dates,content_ratings",
    );
  });

  it("maps the next scheduled episode for followed series", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: 12,
        name: "Series",
        original_name: "Series",
        type: "Talk Show",
        overview: "",
        first_air_date: "2025-01-01",
        genres: [],
        vote_average: 8,
        number_of_seasons: 3,
        number_of_episodes: 20,
        next_episode_to_air: { air_date: "2027-02-03" },
      }),
    );
    await expect(new TmdbClient(transport).getTitle("token", "series", 12, "en-US")).resolves.toMatchObject({
      seasons: 3,
      nextAirDate: "2027-02-03",
      showType: "Talk Show",
    });
  });

  it("combines multiple roles for the same title into one person credit", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: 976,
        name: "Example Person",
        biography: "",
        combined_credits: {
          cast: [{ id: 25, media_type: "movie", title: "Example Film", character: "Lead", release_date: "2026-01-01" }],
          crew: [{ id: 25, media_type: "movie", title: "Example Film", job: "Producer", release_date: "2026-01-01" }],
        },
      }),
    );

    const result = await new TmdbClient(transport).getPerson("token", 976, "en-US");

    expect(result.credits).toEqual([expect.objectContaining({ id: 25, role: "Lead · Producer" })]);
  });

  it("discovers localized candidates by preferred genres", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        page: 1,
        total_pages: 3,
        results: [
          {
            id: 42,
            title: "Candidate",
            overview: "Overview",
            release_date: "2026-01-01",
            poster_path: "/poster.jpg",
            genre_ids: [28, 12],
            vote_average: 7.8,
            vote_count: 900,
            popularity: 55,
          },
        ],
      }),
    );
    const result = await new TmdbClient(transport).discover("token", "movie", [28, 12], "en-US");
    expect(result.results[0]).toMatchObject({ id: 42, type: "movie", genreIds: [28, 12], rating: 7.8 });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("with_genres")).toBe("28|12");
    expect(url.searchParams.get("vote_count.gte")).toBe("100");
  });

  it("loads localized trending and upcoming movies from their TMDB feeds", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ page: 1, total_pages: 2, results: [] }))
      .mockResolvedValueOnce(jsonResponse({ page: 2, total_pages: 3, results: [] }));
    const client = new TmdbClient(transport);

    await client.trending("token", "movie", "sv-SE");
    await client.upcoming("token", "movie", "sv-SE", 2, { genreId: 28, minimumRating: 7, sort: "rating" });

    const trendingUrl = new URL(String(transport.mock.calls[0]?.[0]));
    expect(trendingUrl.pathname).toBe("/3/trending/movie/week");
    expect(trendingUrl.searchParams.get("language")).toBe("sv-SE");
    const upcomingUrl = new URL(String(transport.mock.calls[1]?.[0]));
    expect(upcomingUrl.pathname).toBe("/3/discover/movie");
    expect(upcomingUrl.searchParams.get("page")).toBe("2");
    expect(upcomingUrl.searchParams.get("region")).toBe("SE");
    expect(upcomingUrl.searchParams.get("with_genres")).toBe("28");
    expect(upcomingUrl.searchParams.get("vote_average.gte")).toBe("7");
    expect(upcomingUrl.searchParams.get("sort_by")).toBe("vote_average.desc");
  });

  it("loads one upcoming feed per selected original language", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ page: 1, total_pages: 3, results: [] }))
      .mockResolvedValueOnce(jsonResponse({ page: 1, total_pages: 2, results: [] }));
    const client = new TmdbClient(transport);

    const result = await client.upcoming("token", "series", "en-US", 1, {
      originalLanguages: ["en", "sv"],
      sort: "popularity",
    });

    expect(transport).toHaveBeenCalledTimes(2);
    expect(new URL(String(transport.mock.calls[0]?.[0])).searchParams.get("with_original_language")).toBe("en");
    expect(new URL(String(transport.mock.calls[1]?.[0])).searchParams.get("with_original_language")).toBe("sv");
    expect(result.totalPages).toBe(3);
  });

  it("loads title-to-title recommendations", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        page: 1,
        total_pages: 1,
        results: [
          {
            id: 43,
            name: "Related series",
            overview: "Overview",
            first_air_date: "2025-01-01",
            genre_ids: [18],
            vote_average: 8,
            vote_count: 400,
            popularity: 30,
          },
        ],
      }),
    );
    const result = await new TmdbClient(transport).getRecommendations("token", "series", 12, "en-US");
    expect(result.results[0]).toMatchObject({ id: 43, type: "series", title: "Related series" });
    expect(new URL(String(transport.mock.calls[0]?.[0])).pathname).toBe("/3/tv/12/recommendations");
  });

  it("returns sanitized errors for rejected requests", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status_message: "sensitive" }, 401));
    await expect(new TmdbClient(transport).getConfiguration("bad-token")).rejects.toEqual(
      expect.objectContaining<TmdbRequestError>({
        name: "TmdbRequestError",
        status: 401,
        message: "TMDB request failed",
      }),
    );
  });
});
