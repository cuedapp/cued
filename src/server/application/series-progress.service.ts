import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";
import { calculateSeriesCompletion } from "./series-completion";

export class SeriesProgressService {
  constructor(private readonly repository: MediaSyncRepository) {}

  async getCompletion(userId: string, seriesJellyfinId: string, now = new Date()) {
    return calculateSeriesCompletion(await this.repository.getSeriesEpisodes(userId, seriesJellyfinId), now);
  }
}
