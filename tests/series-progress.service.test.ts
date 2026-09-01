import { describe, expect, it, vi } from "vitest";
import { SeriesProgressService } from "@/server/application/series-progress.service";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";

describe("SeriesProgressService", () => {
  it("loads a user's persisted episodes before calculating completion", async () => {
    const repository = {
      getSeriesEpisodes: vi.fn().mockResolvedValue([{ played: true }, { played: false }]),
    } as unknown as MediaSyncRepository;
    await expect(new SeriesProgressService(repository).getCompletion("user", "series", new Date())).resolves.toEqual({
      played: 1,
      released: 2,
      percentage: 50,
    });
    expect(repository.getSeriesEpisodes).toHaveBeenCalledWith("user", "series");
  });
});
