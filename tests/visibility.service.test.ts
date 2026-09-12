import { describe, expect, it, vi } from "vitest";
import { VisibilityService } from "@/server/application/visibility.service";
import type { VisibilityRepository } from "@/server/db/repositories/visibility.repository";

describe("VisibilityService", () => {
  it("reads and saves the complete visibility policy", async () => {
    const settings = {
      showServerStatisticsToUsers: true,
      showRecentActivityToUsers: false,
      showWatchingNowToUsers: false,
    };
    const repository = {
      get: vi.fn().mockResolvedValue(settings),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as VisibilityRepository;
    const service = new VisibilityService(repository);

    await expect(service.getSettings()).resolves.toEqual(settings);
    await service.saveSettings(settings);

    expect(repository.save).toHaveBeenCalledWith(settings);
  });
});
