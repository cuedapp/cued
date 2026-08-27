import { describe, expect, it, vi } from "vitest";
import { TasteService } from "@/server/application/taste.service";
import type { TasteRepository } from "@/server/db/repositories/taste.repository";

describe("TasteService", () => {
  it("only saves feedback for media in the current user's history", async () => {
    const repository = { isInUserHistory: vi.fn().mockResolvedValue(true), saveFeedback: vi.fn().mockResolvedValue({ id: "feedback" }) } as unknown as TasteRepository;
    const service = new TasteService(repository);
    await expect(service.saveFeedback("user", "media", { rating: 5, tags: [], excluded: false })).resolves.toEqual({ id: "feedback" });
    expect(repository.saveFeedback).toHaveBeenCalledWith("user", "media", { rating: 5, tags: [], excluded: false });
  });

  it("rejects feedback for media outside the current user's history", async () => {
    const repository = { isInUserHistory: vi.fn().mockResolvedValue(false) } as unknown as TasteRepository;
    await expect(new TasteService(repository).saveFeedback("user", "media", { tags: [], excluded: false })).rejects.toThrow("history");
  });

  it("derives series completion and recency from released episode activity", async () => {
    const oldSeriesDate = new Date("2025-01-01T12:00:00Z");
    const recentEpisodeDate = new Date("2026-08-25T18:00:00Z");
    const repository = {
      getHistory: vi.fn().mockResolvedValue([{ id: "series", jellyfinItemId: "jf-series", kind: "series", played: false, playedPercentage: 0, lastPlayedAt: oldSeriesDate }]),
      getSeriesEpisodes: vi.fn().mockResolvedValue([
        { premiereDate: new Date("2026-01-01T00:00:00Z"), played: true, lastPlayedAt: recentEpisodeDate },
        { premiereDate: new Date("2026-02-01T00:00:00Z"), played: true, lastPlayedAt: recentEpisodeDate },
        { premiereDate: new Date("2027-01-01T00:00:00Z"), played: false, lastPlayedAt: null },
      ]),
    } as unknown as TasteRepository;
    const [series] = await new TasteService(repository).getHistory("user");
    expect(series).toMatchObject({ played: true, playedPercentage: 100, lastPlayedAt: recentEpisodeDate });
  });

  it("keeps watched seasons available for optional ratings", async () => {
    const season = { id: "season", jellyfinItemId: "jf-season", kind: "season", played: true, playedPercentage: 100, lastPlayedAt: new Date("2026-08-20T18:00:00Z") };
    const repository = { getHistory: vi.fn().mockResolvedValue([season]) } as unknown as TasteRepository;
    await expect(new TasteService(repository).getHistory("user")).resolves.toEqual([season]);
  });
});
