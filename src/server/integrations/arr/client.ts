import { z } from "zod";
import type { ArrConnection, ArrKind, ArrProvider, ArrQualityProfile, ArrRootFolder, ArrSystemStatus, ArrTitle } from "./provider";

const statusSchema = z.object({ instanceName: z.string().optional(), version: z.string() }).loose();
const rootFoldersSchema = z.array(z.object({ id: z.number().int(), path: z.string(), freeSpace: z.number().optional() }).loose());
const profilesSchema = z.array(z.object({ id: z.number().int(), name: z.string() }).loose());
const tagsSchema = z.array(z.object({ id: z.number().int(), label: z.string() }).loose());
const titleSchema = z.object({ id: z.number().int().optional(), tmdbId: z.number().int(), title: z.string(), year: z.number().int().optional() }).loose();

export class ArrRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "ArrRequestError"; }
}

export class ArrClient implements ArrProvider {
  constructor(public readonly kind: ArrKind, private readonly transport: typeof fetch = fetch) {}

  async getStatus(connection: ArrConnection): Promise<ArrSystemStatus> {
    const value = statusSchema.parse(await this.request(connection, "/system/status"));
    return { instanceName: value.instanceName || (this.kind === "radarr" ? "Radarr" : "Sonarr"), version: value.version };
  }

  async getRootFolders(connection: ArrConnection): Promise<ArrRootFolder[]> {
    return rootFoldersSchema.parse(await this.request(connection, "/rootfolder"));
  }

  async getQualityProfiles(connection: ArrConnection): Promise<ArrQualityProfile[]> {
    return profilesSchema.parse(await this.request(connection, "/qualityprofile"));
  }

  async getTags(connection: ArrConnection) { return tagsSchema.parse(await this.request(connection, "/tag")); }

  async getExistingTmdbIds(connection: ArrConnection) {
    const result = await this.request(connection, this.kind === "radarr" ? "/movie" : "/series");
    return z.array(titleSchema).parse(result).map((title) => title.tmdbId);
  }

  async lookup(connection: ArrConnection, tmdbId: number): Promise<ArrTitle | undefined> {
    if (this.kind === "radarr") {
      const result = await this.request(connection, `/movie/lookup/tmdb?tmdbId=${tmdbId}`);
      const parsed = titleSchema.safeParse(result);
      return parsed.success ? { ...parsed.data, raw: result as Record<string, unknown> } : undefined;
    }
    const result = await this.request(connection, `/series/lookup?term=${encodeURIComponent(`tmdb:${tmdbId}`)}`);
    const parsed = z.array(titleSchema).safeParse(result);
    const title = parsed.success ? parsed.data.find((item) => item.tmdbId === tmdbId) ?? parsed.data[0] : undefined;
    return title ? { ...title, raw: title as Record<string, unknown> } : undefined;
  }

  async add(connection: ArrConnection, title: ArrTitle, options: { rootFolderPath: string; qualityProfileId: number; tagIds?: number[]; searchOnAdd?: boolean; seriesMonitor?: string }): Promise<ArrTitle> {
    const payload = this.kind === "radarr"
      ? { ...title.raw, rootFolderPath: options.rootFolderPath, qualityProfileId: options.qualityProfileId, tags: options.tagIds ?? [], monitored: true, minimumAvailability: "released", addOptions: { searchForMovie: options.searchOnAdd ?? true } }
      : { ...title.raw, rootFolderPath: options.rootFolderPath, qualityProfileId: options.qualityProfileId, tags: options.tagIds ?? [], monitored: true, seasonFolder: true, addOptions: { monitor: options.seriesMonitor ?? "all", searchForMissingEpisodes: options.searchOnAdd ?? true } };
    const result = await this.request(connection, this.kind === "radarr" ? "/movie" : "/series", { method: "POST", body: JSON.stringify(payload) });
    const parsed = titleSchema.parse(result);
    return { ...parsed, raw: result as Record<string, unknown> };
  }

  private async request(connection: ArrConnection, path: string, init: RequestInit = {}) {
    const baseUrl = connection.baseUrl.replace(/\/+$/, "");
    let response: Response;
    try {
      response = await this.transport(`${baseUrl}/api/v3${path}`, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", "X-Api-Key": connection.apiKey }, signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new ArrRequestError(0, `${this.kind === "radarr" ? "Radarr" : "Sonarr"} could not be reached`);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => undefined) as { message?: string; errorMessage?: string } | undefined;
      throw new ArrRequestError(response.status, body?.message || body?.errorMessage || `${this.kind === "radarr" ? "Radarr" : "Sonarr"} request failed`);
    }
    return response.json() as Promise<unknown>;
  }
}
