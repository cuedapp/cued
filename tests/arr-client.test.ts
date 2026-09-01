import { describe, expect, it, vi } from "vitest";
import { ArrClient, ArrRequestError } from "@/server/integrations/arr/client";

const connection = { baseUrl: "http://arr.local/", apiKey: "secret" };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

describe("ArrClient", () => {
  it("discovers server configuration without exposing the key in the URL", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(json({ instanceName: "Movies", version: "6.0.0" }))
      .mockResolvedValueOnce(json([{ id: 1, path: "/movies" }]))
      .mockResolvedValueOnce(json([{ id: 2, name: "HD" }]));
    const client = new ArrClient("radarr", transport);
    await expect(
      Promise.all([
        client.getStatus(connection),
        client.getRootFolders(connection),
        client.getQualityProfiles(connection),
      ]),
    ).resolves.toEqual([
      { instanceName: "Movies", version: "6.0.0" },
      [{ id: 1, path: "/movies" }],
      [{ id: 2, name: "HD" }],
    ]);
    expect(transport.mock.calls.every(([url]) => !String(url).includes("secret"))).toBe(true);
    expect(transport.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-Api-Key": "secret" });
  });

  it("looks up and requests a movie with the configured defaults", async () => {
    const movie = { tmdbId: 10, title: "Movie", year: 2026, titleSlug: "movie-10" };
    const transport = vi
      .fn()
      .mockResolvedValueOnce(json(movie))
      .mockResolvedValueOnce(json({ ...movie, id: 4 }));
    const client = new ArrClient("radarr", transport);
    const found = await client.lookup(connection, 10);
    await client.add(connection, found!, { rootFolderPath: "/movies", qualityProfileId: 2 });
    expect(transport.mock.calls[0]?.[0]).toBe("http://arr.local/api/v3/movie/lookup/tmdb?tmdbId=10");
    expect(JSON.parse(transport.mock.calls[1]?.[1]?.body as string)).toMatchObject({
      rootFolderPath: "/movies",
      qualityProfileId: 2,
      monitored: true,
      addOptions: { searchForMovie: true },
    });
  });

  it("loads the provider inventory for request-state checks", async () => {
    const transport = vi.fn().mockResolvedValue(
      json([
        { id: 4, tmdbId: 10, title: "Movie" },
        { id: 5, tmdbId: 20, title: "Other" },
      ]),
    );
    await expect(new ArrClient("radarr", transport).getExistingTmdbIds(connection)).resolves.toEqual([10, 20]);
    expect(transport.mock.calls[0]?.[0]).toBe("http://arr.local/api/v3/movie");
  });

  it("maps provider errors to a safe request error", async () => {
    const client = new ArrClient("sonarr", vi.fn().mockResolvedValue(json({ message: "Invalid API key" }, 401)));
    await expect(client.getStatus(connection)).rejects.toEqual(
      expect.objectContaining<Partial<ArrRequestError>>({ status: 401, message: "Invalid API key" }),
    );
  });
});
