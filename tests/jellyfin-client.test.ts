import { describe, expect, it, vi } from "vitest";
import { JellyfinClient, JellyfinRequestError, normalizeJellyfinUrl } from "@/server/integrations/jellyfin/client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("JellyfinClient", () => {
  it("normalizes safe server URLs and rejects embedded credentials", () => {
    expect(normalizeJellyfinUrl("http://192.168.0.10:8096/")).toBe("http://192.168.0.10:8096");
    expect(() => normalizeJellyfinUrl("ftp://example.com")).toThrow("HTTP or HTTPS");
    expect(() => normalizeJellyfinUrl("https://user:secret@example.com")).toThrow("cannot contain credentials");
  });

  it("authenticates a Jellyfin administrator without retaining the password", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        ServerId: "server-1",
        AccessToken: "access-token",
        User: {
          Id: "user-1",
          Name: "Erik",
          PrimaryImageTag: "avatar-tag",
          Policy: { IsAdministrator: true, IsDisabled: false },
        },
      }),
    );
    const result = await new JellyfinClient("http://jellyfin:8096", transport).authenticate("Erik", "password");
    expect(result).toEqual({
      serverId: "server-1",
      accessToken: "access-token",
      user: {
        id: "user-1",
        username: "Erik",
        primaryImageTag: "avatar-tag",
        isAdministrator: true,
        isDisabled: false,
        hasAccessToAllLibraries: true,
        enabledLibraryIds: [],
      },
    });
    expect(transport).toHaveBeenCalledOnce();
    const [, request] = transport.mock.calls[0]!;
    expect(request?.body).toBe(JSON.stringify({ Username: "Erik", Pw: "password" }));
  });

  it("discovers libraries with an API key and never places the key in the URL", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse([
        { ItemId: "movies", Name: "Movies", CollectionType: "movies" },
        { ItemId: "shows", Name: "Shows", CollectionType: "tvshows" },
      ]),
    );
    const libraries = await new JellyfinClient("http://jellyfin:8096", transport).getLibraries("api-key");
    expect(libraries).toHaveLength(2);
    const [url, request] = transport.mock.calls[0]!;
    expect(String(url)).not.toContain("api-key");
    expect(new Headers(request?.headers).get("X-Emby-Token")).toBe("api-key");
  });

  it("proxies a user avatar without placing the API key in the URL", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/jpeg", ETag: "avatar-tag" } }),
      );
    const avatar = await new JellyfinClient("http://jellyfin:8096", transport).getUserAvatar(
      "api-key",
      "user-1",
      "avatar-tag",
    );
    expect(avatar?.contentType).toBe("image/jpeg");
    const [url, request] = transport.mock.calls[0]!;
    expect(String(url)).not.toContain("api-key");
    expect(new Headers(request?.headers).get("X-Emby-Token")).toBe("api-key");
  });

  it("returns a sanitized error when Jellyfin rejects a request", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "sensitive" }, 401));
    await expect(new JellyfinClient("http://jellyfin:8096", transport).getUsers("bad-key")).rejects.toEqual(
      expect.objectContaining<JellyfinRequestError>({
        name: "JellyfinRequestError",
        status: 401,
        message: "Jellyfin request failed",
      }),
    );
  });

  it("passes media and user update cursors to Jellyfin item queries", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ Items: [], TotalRecordCount: 0 }));
    const since = new Date("2026-08-26T12:00:00Z");
    const client = new JellyfinClient("http://jellyfin:8096", transport);
    await client.getItems("api-key", { parentId: "movies", minDateLastSaved: since, minDateLastSavedForUser: since });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("minDateLastSaved")).toBe(since.toISOString());
    expect(url.searchParams.get("minDateLastSavedForUser")).toBe(since.toISOString());
    expect(url.searchParams.get("Fields")).toContain("Genres");
    expect(url.searchParams.get("Fields")).toContain("Overview");
    expect(url.searchParams.get("Fields")).toContain("CommunityRating");
    expect(url.searchParams.get("Fields")).toContain("ProviderIds");
  });

  it("can query a title by external provider ID", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ Items: [], TotalRecordCount: 0 }));
    await new JellyfinClient("http://jellyfin:8096", transport).getItems("api-key", {
      parentId: "iptv-movies",
      externalId: { provider: "Tmdb", id: "603" },
    });
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.searchParams.get("AnyProviderIdEquals")).toBe("Tmdb.603");
  });

  it("retains external provider IDs used to match Jellyfin titles", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        Items: [{ Id: "movie", Name: "Movie", Type: "Movie", ProviderIds: { Tmdb: "42", Imdb: "tt42" } }],
        TotalRecordCount: 1,
      }),
    );
    const [item] = await new JellyfinClient("http://jellyfin:8096", transport).getItems("api-key");
    expect(item?.externalIds).toEqual({ Tmdb: "42", Imdb: "tt42" });
  });

  it("requests a Jellyfin library scan without putting the API key in the URL", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await new JellyfinClient("http://jellyfin:8096", transport).refreshLibrary("api-key");
    const [url, request] = transport.mock.calls[0]!;
    expect(String(url)).toBe("http://jellyfin:8096/Library/Refresh");
    expect(request?.method).toBe("POST");
    expect(String(url)).not.toContain("api-key");
    expect(new Headers(request?.headers).get("X-Emby-Token")).toBe("api-key");
  });
});
