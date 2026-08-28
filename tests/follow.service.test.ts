import { describe, expect, it, vi } from "vitest";
import { FollowService } from "@/server/application/follow.service";
import type { AcquisitionService } from "@/server/application/acquisition.service";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { FollowRepository } from "@/server/db/repositories/follow.repository";

describe("FollowService", () => {
  it("stores the current series snapshot when following", async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: "follow" }) } as unknown as FollowRepository;
    const metadata = { getTitle: vi.fn().mockResolvedValue({ id: 10, title: "Series", seasons: 2, date: "2027-01-01", posterPath: "/poster.jpg", available: false }) } as unknown as TmdbMetadataService;
    const acquisition = { getState: vi.fn().mockResolvedValue("requestable") } as unknown as AcquisitionService;
    await new FollowService(repository, metadata, acquisition).follow("user", "series", 10, "sv");
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "user", targetType: "series", tmdbId: 10, locale: "sv", snapshot: { seasonCount: 2 }, requestState: "requestable" }));
  });

  it("detects new seasons and requestability transitions", async () => {
    const follow = { id: "follow", userId: "user", targetType: "series", tmdbId: 10, locale: "en", title: "Series", imagePath: null, releaseDate: "2027-01-01", snapshot: { seasonCount: 2 }, requestState: "unavailable" };
    const repository = { list: vi.fn().mockResolvedValue([follow]), addEvent: vi.fn(), update: vi.fn() } as unknown as FollowRepository;
    const title = { id: 10, title: "Series", seasons: 3, date: "2027-01-01", posterPath: "/poster.jpg" };
    const metadata = { refreshTitleMetadata: vi.fn().mockResolvedValue(title), getTitle: vi.fn().mockResolvedValue({ ...title, available: false }) } as unknown as TmdbMetadataService;
    const acquisition = { getState: vi.fn().mockResolvedValue("requestable") } as unknown as AcquisitionService;
    await new FollowService(repository, metadata, acquisition).refreshUser("user", "en");
    expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "new_season" }));
    expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "requestable" }));
    expect(repository.update).toHaveBeenCalledWith("follow", expect.objectContaining({ snapshot: { seasonCount: 3 }, requestState: "requestable" }));
  });

  it("detects credits added after a person was followed", async () => {
    const follow = { id: "person-follow", userId: "user", targetType: "person", tmdbId: 7, locale: "en", title: "Person", imagePath: null, releaseDate: null, snapshot: { creditKeys: ["movie:1"] }, requestState: null };
    const repository = { list: vi.fn().mockResolvedValue([follow]), addEvent: vi.fn(), update: vi.fn() } as unknown as FollowRepository;
    const metadata = { getPersonMetadata: vi.fn().mockResolvedValue({ id: 7, name: "Person", credits: [{ id: 1, type: "movie", title: "Old", role: "Actor" }, { id: 2, type: "series", title: "New", role: "Actor" }] }) } as unknown as TmdbMetadataService;
    await new FollowService(repository, metadata, {} as AcquisitionService).refreshUser("user", "en");
    expect(repository.addEvent).toHaveBeenCalledOnce();
    expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "new_credit", relatedTmdbId: 2, relatedTitle: "New" }));
  });
});
