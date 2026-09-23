import { describe, expect, it, vi } from "vitest";
import { BootstrapService } from "@/server/application/bootstrap.service";

const startedAt = new Date("2026-09-23T10:00:00Z");

function runningState(phase: "syncing" | "recommendations" = "syncing") {
  return {
    id: 1,
    status: "running",
    phase,
    userId: "user",
    locale: "en",
    error: null,
    startedAt,
    completedAt: null,
    updatedAt: startedAt,
  };
}

describe("BootstrapService", () => {
  it("orders the initial full sync before recommendation generation", async () => {
    let state = runningState();
    const events: string[] = [];
    const repository = {
      get: vi.fn(() => Promise.resolve(state)),
      claim: vi.fn().mockResolvedValue(state),
      advanceToRecommendations: vi.fn(async () => {
        events.push("advance");
        state = runningState("recommendations");
        return true;
      }),
      complete: vi.fn(async () => {
        events.push("complete");
        return true;
      }),
      fail: vi.fn(),
    };
    const mediaSync = {
      getLatestRun: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn(async () => {
        events.push("sync");
      }),
    };
    const recommendations = {
      getStatus: vi.fn().mockResolvedValue({}),
      refreshAndWait: vi.fn(async () => {
        events.push("recommendations");
        return true;
      }),
    };
    const service = new BootstrapService(repository as never, mediaSync as never, recommendations as never);

    await expect(service.start("user", "en")).resolves.toBe(true);
    await vi.waitFor(() => expect(repository.complete).toHaveBeenCalledOnce());

    expect(mediaSync.sync).toHaveBeenCalledWith("login", "user", "full");
    expect(recommendations.refreshAndWait).toHaveBeenCalledWith("user", "en", true);
    expect(events).toEqual(["sync", "advance", "recommendations", "complete"]);
  });

  it("does not duplicate active bootstrap work on another login", async () => {
    const repository = {
      get: vi.fn().mockResolvedValue(runningState()),
      claim: vi.fn().mockResolvedValue(undefined),
    };
    const mediaSync = { getLatestRun: vi.fn(), sync: vi.fn() };
    const recommendations = { getStatus: vi.fn(), refreshAndWait: vi.fn() };
    const service = new BootstrapService(repository as never, mediaSync as never, recommendations as never);

    await expect(service.start("user", "en")).resolves.toBe(false);
    expect(mediaSync.sync).not.toHaveBeenCalled();
    expect(recommendations.refreshAndWait).not.toHaveBeenCalled();
  });

  it("resumes after a restart when the initial sync already completed", async () => {
    let state = runningState();
    const repository = {
      get: vi.fn(() => Promise.resolve(state)),
      advanceToRecommendations: vi.fn(async () => {
        state = runningState("recommendations");
        return true;
      }),
      complete: vi.fn().mockResolvedValue(true),
      fail: vi.fn(),
    };
    const mediaSync = {
      getLatestRun: vi.fn().mockResolvedValue({
        status: "completed",
        finishedAt: new Date("2026-09-23T10:05:00Z"),
      }),
      sync: vi.fn(),
    };
    const recommendations = {
      getStatus: vi.fn().mockResolvedValue({}),
      refreshAndWait: vi.fn().mockResolvedValue(true),
    };
    const service = new BootstrapService(repository as never, mediaSync as never, recommendations as never);

    await service.reconcile();
    await vi.waitFor(() => expect(repository.complete).toHaveBeenCalledOnce());

    expect(mediaSync.sync).not.toHaveBeenCalled();
    expect(recommendations.refreshAndWait).toHaveBeenCalledOnce();
  });

  it("allows an explicit safe retry after bootstrap failure", async () => {
    const state = runningState();
    const repository = {
      claim: vi.fn().mockResolvedValue(state),
      get: vi.fn().mockResolvedValue(state),
      fail: vi.fn().mockResolvedValue(true),
    };
    const mediaSync = {
      getLatestRun: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockRejectedValue(new Error("unavailable")),
    };
    const recommendations = { getStatus: vi.fn(), refreshAndWait: vi.fn() };
    const service = new BootstrapService(repository as never, mediaSync as never, recommendations as never);

    await expect(service.retry("user", "en")).resolves.toBe(true);
    await vi.waitFor(() => expect(repository.fail).toHaveBeenCalledWith("syncing", "failed"));

    expect(repository.claim).toHaveBeenCalledWith("user", "en", "failed");
    expect(recommendations.refreshAndWait).not.toHaveBeenCalled();
  });
});
