import { describe, expect, it, vi } from "vitest";
import { AppStatusService } from "./app-status.service";

describe("AppStatusService", () => {
  it("returns only the requesting user's visible active jobs with their unread notifications", async () => {
    const recommendations = {
      getStatus: vi.fn().mockResolvedValue({ needsRefresh: false, run: { id: "rec", status: "running" } }),
    };
    const notifications = { listUnread: vi.fn().mockResolvedValue([{ id: "note" }]) };
    const mediaSync = {
      getLatestRun: vi.fn().mockResolvedValue({ id: "sync", status: "running", requestedByUserId: "other" }),
    };
    const strmImport = { getPendingForUser: vi.fn().mockResolvedValue([{ id: "strm" }]) };
    const mediaRatings = { getActiveRun: vi.fn().mockResolvedValue({ id: "ratings", status: "running" }) };
    const m3uEditor = { getActiveRun: vi.fn().mockResolvedValue({ id: "m3u", status: "running" }) };
    const service = new AppStatusService(
      recommendations as never,
      notifications as never,
      mediaSync as never,
      strmImport as never,
      mediaRatings as never,
      m3uEditor as never,
      { getState: vi.fn().mockResolvedValue({ status: "running", phase: "syncing" }) } as never,
    );

    const status = await service.getForUser({ id: "viewer", role: "user" });

    expect(status.jobs).toEqual([
      { id: "rec", label: "recommendations", href: "/recommendations" },
      { id: "strm", label: "strm", href: "/activity" },
    ]);
    expect(status.notifications).toEqual([{ id: "note" }]);
    expect(status.bootstrap).toEqual({ status: "running", phase: "syncing" });
    expect(strmImport.getPendingForUser).toHaveBeenCalledWith("viewer", false);
  });

  it("includes administrator-only jobs for an administrator", async () => {
    const service = new AppStatusService(
      { getStatus: vi.fn().mockResolvedValue({ needsRefresh: false }) } as never,
      { listUnread: vi.fn().mockResolvedValue([]) } as never,
      {
        getLatestRun: vi.fn().mockResolvedValue({ id: "sync", status: "running", requestedByUserId: "other" }),
      } as never,
      { getPendingForUser: vi.fn().mockResolvedValue([]) } as never,
      { getActiveRun: vi.fn().mockResolvedValue({ id: "ratings", status: "running" }) } as never,
      { getActiveRun: vi.fn().mockResolvedValue({ id: "m3u", status: "running" }) } as never,
    );

    const status = await service.getForUser({ id: "admin", role: "admin" });

    expect(status.jobs.map((job) => job.label)).toEqual(["jellyfin", "mediaRatings", "m3u"]);
  });
});
