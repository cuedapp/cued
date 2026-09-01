import { afterEach, describe, expect, it, vi } from "vitest";
import { M3uEditorClient, M3uEditorRequestError } from "./client";

describe("M3uEditorClient", () => {
  afterEach(() => vi.unstubAllGlobals());
  const connection = { baseUrl: "http://m3u.test/", username: "viewer", password: "playlist-secret" };

  it("authenticates without putting credentials in the URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ user_info: { auth: 1 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new M3uEditorClient().authenticate(connection);
    expect(fetchMock.mock.calls[0]![0]).toBe("http://m3u.test/player_api.php");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: "POST" });
    expect(String(fetchMock.mock.calls[0]![1].body)).toContain("password=playlist-secret");
  });

  it("loads playlists with a bearer API token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ uuid: "a1630f5e-2700-402e-ab1e-50e24f84bab3", name: "Movies and series" }]), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new M3uEditorClient().getPlaylists("http://m3u.test/", "api-token")).resolves.toEqual([
      { uuid: "a1630f5e-2700-402e-ab1e-50e24f84bab3", name: "Movies and series" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://m3u.test/user/playlists",
      expect.objectContaining({ headers: { Accept: "application/json", Authorization: "Bearer api-token" } }),
    );
  });

  it("normalizes movie and series TMDB availability", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { stream_id: 10, title: "Movie SE", category_id: 7, tmdb_id: 603 },
            { stream_id: 11, title: "Unmatched", tmdb_id: 0, tmdb: "0" },
            { stream_id: 12, title: "Bad metadata", tmdb_id: "not-a-number" },
            { title: "Missing stream ID", tmdb_id: 42 },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { series_id: 20, name: "Series", category_id: "8", tmdb: "1396" },
            { series_id: 21, name: null, tmdb_id: 0 },
            { name: "Missing series ID", tmdb_id: 43 },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ category_id: 7, category_name: "Swedish Movies" }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ category_id: 8, category_name: "Nordic Series" }]), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new M3uEditorClient().getTitles(connection)).resolves.toEqual([
      { type: "movie", tmdbId: 603, externalId: "10", title: "Movie SE", groupName: "Swedish Movies" },
      { type: "series", tmdbId: 1396, externalId: "20", title: "Series", groupName: "Nordic Series" },
    ]);
  });

  it("reports provider failures without response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret upstream body", { status: 401 })));
    await expect(new M3uEditorClient().authenticate(connection)).rejects.toEqual(
      new M3uEditorRequestError("M3U Editor returned 401"),
    );
  });

  it("loads and sorts series episodes for STRM generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          episodes: {
            "2": [{ id: 22, episode_num: 1, title: "Return", container_extension: "mp4" }],
            "1": [
              { id: 11, episode_num: 2, title: "Next", container_extension: ".mkv" },
              { id: 10, episode_num: 1, title: "Pilot" },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new M3uEditorClient().getSeriesEpisodes(connection, "99")).resolves.toEqual([
      { externalId: "10", seasonNumber: 1, episodeNumber: 1, title: "Pilot", containerExtension: "mkv" },
      { externalId: "11", seasonNumber: 1, episodeNumber: 2, title: "Next", containerExtension: "mkv" },
      { externalId: "22", seasonNumber: 2, episodeNumber: 1, title: "Return", containerExtension: "mp4" },
    ]);
    expect(String(fetchMock.mock.calls[0]![1].body)).toContain("series_id=99");
  });
});
