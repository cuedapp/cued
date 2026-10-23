import { describe, expect, it, vi } from "vitest";
import { AcquisitionService } from "./acquisition.service";

describe("AcquisitionService", () => {
  it("notifies each requester once Jellyfin has confirmed their approved title", async () => {
    const repository = {
      claimAvailableRequests: vi
        .fn()
        .mockResolvedValue([{ userId: "user-1", mediaType: "movie", tmdbId: 42, title: "The Answer" }]),
    };
    const notifications = { notifyUser: vi.fn().mockResolvedValue(undefined) };
    const service = new AcquisitionService(repository as never, {} as never, {} as never, notifications as never);

    await service.notifyAvailableAfterJellyfinSync("jellyfin-1");

    expect(repository.claimAvailableRequests).toHaveBeenCalledWith("jellyfin-1");
    expect(notifications.notifyUser).toHaveBeenCalledWith(
      "user-1",
      "request.available",
      "/title/movie/42",
      "The Answer",
    );
  });
  it("notifies administrators when a new request awaits approval", async () => {
    const repository = {
      findPending: vi.fn().mockResolvedValue(undefined),
      createPending: vi.fn().mockResolvedValue({ created: true, request: { id: "request-1", userId: "user-1" } }),
    };
    const provider = { getRequestState: vi.fn().mockResolvedValue("missing") };
    const notifications = { notifyAdmins: vi.fn().mockResolvedValue(undefined) };
    const service = new AcquisitionService(
      repository as never,
      provider as never,
      provider as never,
      notifications as never,
    );

    await service.request(
      { id: "user-1", role: "user", requestsRequireApproval: true } as never,
      "movie",
      42,
      {},
      "The Answer",
    );

    expect(notifications.notifyAdmins).toHaveBeenCalledWith("request.pending", "/requests", "The Answer");
  });
});
