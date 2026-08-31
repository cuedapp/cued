import type { AcquisitionRepository } from "@/server/db/repositories/acquisition.repository";
import type { User } from "@/server/db/schema";
import type { ArrIntegrationService } from "./arr-integration.service";

export class AcquisitionService {
  constructor(private readonly repository: AcquisitionRepository, private readonly radarr: ArrIntegrationService, private readonly sonarr: ArrIntegrationService) {}

  async request(user: User, type: "movie" | "series", tmdbId: number, options: { rootFolderPath?: string; qualityProfileId?: number } = {}) {
    const provider = type === "movie" ? this.radarr : this.sonarr;
    const existingPending = await this.repository.findPending(type, tmdbId);
    if (existingPending) return { state: "pending" as const, requestId: existingPending.id };
    if (user.role === "admin" || !user.requestsRequireApproval) {
      const pending = await this.repository.createPending(user.id, type, tmdbId);
      if (!pending.created) return { state: "pending" as const, requestId: pending.request.id };
      const request = pending.request;
      try {
        const result = await provider.request(tmdbId, options);
        await this.repository.complete(request.id, user.id, "approved", { providerItemId: result.title.id, rootFolderPath: result.rootFolderPath, qualityProfileId: result.qualityProfileId });
        return result;
      } catch (error) {
        await this.repository.complete(request.id, user.id, "failed", { error: error instanceof Error ? error.message : "Request failed", ...options });
        throw error;
      }
    }
    const state = await provider.getRequestState(tmdbId);
    if (state === "unavailable") throw new Error(`${type === "movie" ? "Radarr" : "Sonarr"} is not configured`);
    if (state === "existing") return { state: "existing" as const };
    const pending = await this.repository.createPending(user.id, type, tmdbId);
    return { state: "pending" as const, requestId: pending.request.id };
  }

  getPending() { return this.repository.getPending(); }
  getHistory() { return this.repository.getHistory(); }
  async getForUser(userId: string, requestedPage: number, pageSize = 20) {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    let result = await this.repository.getForUser(userId, page, pageSize);
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const resolvedPage = Math.min(page, totalPages);
    if (resolvedPage !== page) result = await this.repository.getForUser(userId, resolvedPage, pageSize);
    return { ...result, page: resolvedPage, totalPages };
  }
  getPendingKeys(userId: string) { return this.repository.getPendingKeys(userId); }

  async getState(type: "movie" | "series", tmdbId: number) {
    if (await this.repository.findPending(type, tmdbId)) return "pending" as const;
    return (type === "movie" ? this.radarr : this.sonarr).getRequestState(tmdbId);
  }

  async getStates(items: Array<{ type: "movie" | "series"; tmdbId: number }>) {
    const [pendingKeys, movies, series] = await Promise.all([this.repository.getAllPendingKeys(), this.radarr.getExistingTmdbIds(), this.sonarr.getExistingTmdbIds()]);
    const pending = new Set(pendingKeys);
    const existingMovies = new Set(movies);
    const existingSeries = new Set(series);
    return Object.fromEntries(items.map(({ type, tmdbId }) => {
      const key = `${type}:${tmdbId}`;
      return [key, pending.has(key) ? "pending" : (type === "movie" ? existingMovies : existingSeries).has(tmdbId) ? "existing" : "idle"];
    })) as Record<string, "idle" | "pending" | "existing">;
  }

  async approve(requestId: string, adminUserId: string, options: { rootFolderPath: string; qualityProfileId: number }) {
    const request = await this.repository.getById(requestId);
    if (!request || request.status !== "pending") throw new Error("Request is no longer pending");
    const provider = request.mediaType === "movie" ? this.radarr : this.sonarr;
    try {
      const result = await provider.request(request.tmdbId, options);
      await this.repository.complete(request.id, adminUserId, "approved", { providerItemId: result.title.id, rootFolderPath: result.rootFolderPath, qualityProfileId: result.qualityProfileId });
      return result;
    } catch (error) {
      await this.repository.complete(request.id, adminUserId, "failed", { error: error instanceof Error ? error.message : "Request failed", ...options });
      throw error;
    }
  }

  reject(requestId: string, adminUserId: string) { return this.repository.complete(requestId, adminUserId, "rejected"); }
  setUserApprovalPolicy(userId: string, requireApproval: boolean) { return this.repository.setUserApprovalPolicy(userId, requireApproval); }
}
