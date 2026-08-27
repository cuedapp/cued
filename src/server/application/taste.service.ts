import type { TasteRepository } from "@/server/db/repositories/taste.repository";
import { calculateSeriesCompletion } from "./series-completion";

export class TasteService {
  constructor(private readonly repository: TasteRepository) {}

  async getHistory(userId: string) {
    const history = await this.repository.getHistory(userId);
    const resolved = await Promise.all(history.map(async (item) => {
      if (item.kind !== "series") return item;
      const episodes = await this.repository.getSeriesEpisodes(userId, item.jellyfinItemId);
      const completion = calculateSeriesCompletion(episodes);
      const lastEpisodePlayedAt = episodes.reduce<Date | null>((latest, episode) => episode.lastPlayedAt && (!latest || episode.lastPlayedAt > latest) ? episode.lastPlayedAt : latest, null);
      return { ...item, played: completion.percentage === 100, playedPercentage: completion.percentage, lastPlayedAt: lastEpisodePlayedAt ?? item.lastPlayedAt };
    }));
    return resolved.filter((item) => item.played || (item.playedPercentage ?? 0) > 0).sort((a, b) => (b.lastPlayedAt?.getTime() ?? 0) - (a.lastPlayedAt?.getTime() ?? 0));
  }

  async getOnboarding(userId: string) {
    return this.repository.getOnboarding(userId);
  }

  async saveFeedback(userId: string, mediaItemId: string, input: { rating?: number; feedback?: string; tags: string[]; excluded: boolean }) {
    if (!await this.repository.isInUserHistory(userId, mediaItemId)) throw new Error("Media is not in this user's history");
    return this.repository.saveFeedback(userId, mediaItemId, input);
  }

  async isInHistory(userId: string, mediaItemId: string) {
    return this.repository.isInUserHistory(userId, mediaItemId);
  }

  async getJellyfinItemId(userId: string, mediaItemId: string) {
    return this.repository.getJellyfinItemIdForUser(userId, mediaItemId);
  }

  async completeOnboarding(userId: string, status: "completed" | "skipped") {
    const sourceMediaCount = status === "completed" ? await this.repository.getCompletedMediaCount(userId) : 0;
    return this.repository.completeOnboarding(userId, status, sourceMediaCount, { inferredFromWatchHistory: status === "completed" });
  }
}
