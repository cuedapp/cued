import { z } from "zod";
import type { MediaLibrary, MediaServerAuthentication, MediaServerImage, MediaServerInfo, MediaServerItem, MediaServerProvider, MediaServerUser } from "../media-server-provider";

const systemInfoSchema = z.object({
  Id: z.string().min(1),
  ServerName: z.string().min(1),
  Version: z.string().min(1),
});

const userSchema = z.object({
  Id: z.string().min(1),
  Name: z.string().min(1),
  PrimaryImageTag: z.string().nullish(),
  Policy: z.object({
    IsAdministrator: z.boolean().optional(),
    IsDisabled: z.boolean().optional(),
    EnableAllFolders: z.boolean().optional(),
    EnabledFolders: z.array(z.string()).optional(),
  }).optional(),
});

const authenticationSchema = z.object({
  ServerId: z.string().min(1),
  AccessToken: z.string().min(1),
  User: userSchema,
});

const librarySchema = z.object({
  ItemId: z.string().nullish(),
  Name: z.string().min(1),
  CollectionType: z.string().nullish(),
});

const itemSchema = z.object({
  Id: z.string().min(1),
  Name: z.string().min(1),
  Type: z.enum(["Movie", "Series", "Season", "Episode"]),
  ParentId: z.string().nullish(),
  SeriesId: z.string().nullish(),
  SeasonId: z.string().nullish(),
  PremiereDate: z.string().datetime({ offset: true }).nullish(),
  RunTimeTicks: z.union([z.string(), z.number()]).nullish(),
  ProviderIds: z.record(z.string(), z.string()).optional(),
  UserData: z.object({
    Played: z.boolean().optional(),
    PlayCount: z.number().int().nonnegative().optional(),
    PlayedPercentage: z.number().nonnegative().optional(),
    PlaybackPositionTicks: z.union([z.string(), z.number()]).optional(),
    LastPlayedDate: z.string().datetime({ offset: true }).nullish(),
  }).nullish(),
}).loose();

const itemPageSchema = z.object({ Items: z.array(itemSchema), TotalRecordCount: z.number().int().nonnegative() });

export class JellyfinRequestError extends Error {
  constructor(public readonly status: number, message = "Jellyfin request failed") {
    super(message);
    this.name = "JellyfinRequestError";
  }
}

export function normalizeJellyfinUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Jellyfin URL must use HTTP or HTTPS");
  if (url.username || url.password || url.search || url.hash) throw new Error("Jellyfin URL cannot contain credentials, a query, or a fragment");
  return url.toString().replace(/\/$/, "");
}

function mapUser(user: z.infer<typeof userSchema>): MediaServerUser {
  return {
    id: user.Id,
    username: user.Name,
    ...(user.PrimaryImageTag ? { primaryImageTag: user.PrimaryImageTag } : {}),
    isAdministrator: user.Policy?.IsAdministrator ?? false,
    isDisabled: user.Policy?.IsDisabled ?? false,
    hasAccessToAllLibraries: user.Policy?.EnableAllFolders ?? true,
    enabledLibraryIds: user.Policy?.EnabledFolders ?? [],
  };
}

export class JellyfinClient implements MediaServerProvider {
  readonly baseUrl: string;

  constructor(baseUrl: string, private readonly transport: typeof fetch = fetch) {
    this.baseUrl = normalizeJellyfinUrl(baseUrl);
  }

  async getPublicInfo(): Promise<MediaServerInfo> {
    return this.mapInfo(systemInfoSchema.parse(await this.request("/System/Info/Public")));
  }

  async testConnection(apiKey?: string): Promise<MediaServerInfo> {
    if (!apiKey) return this.getPublicInfo();
    return this.mapInfo(systemInfoSchema.parse(await this.request("/System/Info", { apiKey })));
  }

  async authenticate(username: string, password: string): Promise<MediaServerAuthentication> {
    const result = authenticationSchema.parse(await this.request("/Users/AuthenticateByName", {
      method: "POST",
      body: { Username: username, Pw: password },
    }));
    return { serverId: result.ServerId, accessToken: result.AccessToken, user: mapUser(result.User) };
  }

  async getLibraries(apiKey: string): Promise<MediaLibrary[]> {
    const result = z.array(librarySchema).parse(await this.request("/Library/VirtualFolders", { apiKey }));
    return result.flatMap((library) => library.ItemId ? [{ id: library.ItemId, name: library.Name, ...(library.CollectionType ? { collectionType: library.CollectionType } : {}) }] : []);
  }

  async getUsers(apiKey: string): Promise<MediaServerUser[]> {
    return z.array(userSchema).parse(await this.request("/Users", { apiKey })).map(mapUser);
  }

  async getUserAvatar(apiKey: string, userId: string, tag?: string): Promise<MediaServerImage | undefined> {
    const query = new URLSearchParams({ maxWidth: "160", quality: "90" });
    if (tag) query.set("tag", tag);
    const headers = this.createHeaders(apiKey);
    headers.set("Accept", "image/*");
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl}/Users/${encodeURIComponent(userId)}/Images/Primary?${query}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new JellyfinRequestError(0, "Jellyfin server could not be reached");
    }
    if (response.status === 404) return undefined;
    if (!response.ok) throw new JellyfinRequestError(response.status);
    return {
      body: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") ?? "image/jpeg",
      ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
    };
  }

  async getItemImage(apiKey: string, itemId: string): Promise<MediaServerImage | undefined> {
    const response = await this.requestImage(`/Items/${encodeURIComponent(itemId)}/Images/Primary?maxWidth=400`, apiKey);
    return response;
  }

  async getItems(apiKey: string, options: { userId?: string; parentId?: string; minDateLastSaved?: Date; minDateLastSavedForUser?: Date } = {}): Promise<MediaServerItem[]> {
    const items: MediaServerItem[] = [];
    const pageSize = 500;
    for (let startIndex = 0; ; startIndex += pageSize) {
      const path = options.userId ? `/Users/${encodeURIComponent(options.userId)}/Items` : "/Items";
      const query = new URLSearchParams({
        Recursive: "true",
        IncludeItemTypes: "Movie,Series,Season,Episode",
        Fields: "ParentId,SeriesId,SeasonId,PremiereDate,RunTimeTicks,ProviderIds,UserData",
        StartIndex: String(startIndex),
        Limit: String(pageSize),
      });
      if (options.parentId) query.set("ParentId", options.parentId);
      if (options.minDateLastSaved) query.set("minDateLastSaved", options.minDateLastSaved.toISOString());
      if (options.minDateLastSavedForUser) query.set("minDateLastSavedForUser", options.minDateLastSavedForUser.toISOString());
      const page = itemPageSchema.parse(await this.request(`${path}?${query}`, { apiKey }));
      items.push(...page.Items.map((item) => this.mapItem(item, options.parentId)));
      if (items.length >= page.TotalRecordCount || page.Items.length === 0) break;
    }
    return items;
  }

  private mapInfo(info: z.infer<typeof systemInfoSchema>): MediaServerInfo {
    return { id: info.Id, name: info.ServerName, version: info.Version };
  }

  private mapItem(item: z.infer<typeof itemSchema>, libraryId?: string): MediaServerItem {
    const userData = item.UserData ? {
      played: item.UserData.Played ?? false,
      playCount: item.UserData.PlayCount ?? 0,
      ...(item.UserData.PlayedPercentage !== undefined ? { playedPercentage: item.UserData.PlayedPercentage } : {}),
      ...(item.UserData.PlaybackPositionTicks !== undefined ? { playbackPositionTicks: String(item.UserData.PlaybackPositionTicks) } : {}),
      ...(item.UserData.LastPlayedDate ? { lastPlayedAt: new Date(item.UserData.LastPlayedDate) } : {}),
    } : undefined;
    return {
      id: item.Id,
      name: item.Name,
      kind: item.Type.toLowerCase() as MediaServerItem["kind"],
      ...(libraryId ? { libraryId } : {}),
      ...(item.SeriesId ? { seriesId: item.SeriesId } : {}),
      ...(item.SeasonId ? { seasonId: item.SeasonId } : {}),
      ...(item.ParentId ? { parentId: item.ParentId } : {}),
      ...(item.PremiereDate ? { premiereDate: new Date(item.PremiereDate) } : {}),
      ...(item.RunTimeTicks !== null && item.RunTimeTicks !== undefined ? { runtimeTicks: String(item.RunTimeTicks) } : {}),
      externalIds: item.ProviderIds ?? {},
      ...(userData ? { userData } : {}),
      raw: item,
    };
  }

  private async request(path: string, options: { method?: "GET" | "POST"; apiKey?: string; body?: Record<string, unknown> } = {}): Promise<unknown> {
    const headers = this.createHeaders(options.apiKey);
    if (options.body) headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new JellyfinRequestError(0, "Jellyfin server could not be reached");
    }
    if (!response.ok) throw new JellyfinRequestError(response.status);
    return response.json();
  }

  private async requestImage(path: string, apiKey: string): Promise<MediaServerImage | undefined> {
    let response: Response;
    try { response = await this.transport(`${this.baseUrl}${path}`, { headers: this.createHeaders(apiKey), signal: AbortSignal.timeout(10_000) }); } catch { throw new JellyfinRequestError(0, "Jellyfin could not be reached"); }
    if (response.status === 404) return undefined;
    if (!response.ok) throw new JellyfinRequestError(response.status);
    return { body: await response.arrayBuffer(), contentType: response.headers.get("content-type") ?? "image/jpeg", ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}) };
  }

  private createHeaders(apiKey?: string) {
    const headers = new Headers({ Accept: "application/json", Authorization: 'MediaBrowser Client="Cued", Device="Cued Server", DeviceId="cued-server", Version="0.3.0"' });
    if (apiKey) headers.set("X-Emby-Token", apiKey);
    return headers;
  }
}
