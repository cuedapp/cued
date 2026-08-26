import { describe, expect, it, vi } from "vitest";
import { TmdbClient, TmdbRequestError } from "@/server/integrations/tmdb/client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("TmdbClient", () => {
  it("tests application authentication without exposing the token in the URL", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ images: { secure_base_url: "https://image.tmdb.org/t/p/" } }));
    const configuration = await new TmdbClient(transport).getConfiguration("read-token");
    expect(configuration.imageSecureBaseUrl).toBe("https://image.tmdb.org/t/p/");
    const [url, request] = transport.mock.calls[0]!;
    expect(String(url)).not.toContain("read-token");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer read-token");
  });

  it("maps localized multi-search results across movies, series and people", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      page: 1,
      total_pages: 1,
      total_results: 3,
      results: [
        { id: 1, media_type: "movie", title: "Filmen", original_title: "The Movie", overview: "Beskrivning", release_date: "2026-01-02", poster_path: "/movie.jpg", popularity: 12 },
        { id: 2, media_type: "tv", name: "Serien", original_name: "The Series", first_air_date: "2025-02-03", poster_path: "/series.jpg", popularity: 10 },
        { id: 3, media_type: "person", name: "Ada Actor", profile_path: "/person.jpg", known_for_department: "Acting", popularity: 8 },
      ],
    }));
    const result = await new TmdbClient(transport).search("token", "sökning", "sv-SE");
    expect(result.results.map((item) => item.type)).toEqual(["movie", "series", "person"]);
    expect(result.results[0]).toMatchObject({ title: "Filmen", originalTitle: "The Movie" });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("language")).toBe("sv-SE");
    expect(url.searchParams.get("query")).toBe("sökning");
  });

  it("loads a title with credits, external IDs and trailers in one request", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      id: 11,
      title: "Localized title",
      original_title: "Original title",
      overview: "Overview",
      release_date: "2026-03-04",
      runtime: 123,
      genres: [{ id: 1, name: "Drama" }],
      vote_average: 7.5,
      external_ids: { imdb_id: "tt0000011" },
      credits: { cast: [{ id: 8, name: "Actor", character: "Lead", profile_path: "/actor.jpg" }], crew: [{ id: 9, name: "Director", job: "Director" }] },
      videos: { results: [{ id: "video", name: "Trailer", site: "YouTube", key: "abc123", type: "Trailer", official: true }] },
    }));
    const result = await new TmdbClient(transport).getTitle("token", "movie", 11, "en-US");
    expect(result).toMatchObject({ id: 11, runtimeMinutes: 123, imdbId: "tt0000011", cast: [{ id: 8, role: "Lead" }], crew: [{ id: 9, role: "Director" }] });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("append_to_response")).toBe("credits,videos,external_ids");
  });

  it("combines multiple roles for the same title into one person credit", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      id: 976,
      name: "Example Person",
      biography: "",
      combined_credits: {
        cast: [{ id: 25, media_type: "movie", title: "Example Film", character: "Lead", release_date: "2026-01-01" }],
        crew: [{ id: 25, media_type: "movie", title: "Example Film", job: "Producer", release_date: "2026-01-01" }],
      },
    }));

    const result = await new TmdbClient(transport).getPerson("token", 976, "en-US");

    expect(result.credits).toEqual([expect.objectContaining({ id: 25, role: "Lead · Producer" })]);
  });

  it("returns sanitized errors for rejected requests", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status_message: "sensitive" }, 401));
    await expect(new TmdbClient(transport).getConfiguration("bad-token")).rejects.toEqual(expect.objectContaining<TmdbRequestError>({ name: "TmdbRequestError", status: 401, message: "TMDB request failed" }));
  });
});
