import { describe, expect, it, vi } from "vitest";
import { isNewerVersion, ReleaseService } from "@/server/application/release.service";

describe("ReleaseService", () => {
  it("compares semantic release versions without treating an older patch as an update", () => {
    expect(isNewerVersion("v0.2.0", "v0.1.9")).toBe(true);
    expect(isNewerVersion("v0.1.1", "v0.1.1")).toBe(false);
    expect(isNewerVersion("v0.1.0", "v0.1.1")).toBe(false);
  });

  it("caches a GitHub release and exposes its notes", async () => {
    let cached: { payload: Record<string, unknown>; updatedAt: Date } | undefined;
    const repository = {
      getCachedRelease: vi.fn(() => Promise.resolve(cached)),
      saveCachedRelease: vi.fn(async (payload) => {
        cached = { payload, updatedAt: new Date() };
      }),
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v9.0.0",
        html_url: "https://example.test/release",
        body: "Important fixes",
        published_at: "2026-08-30T00:00:00Z",
        prerelease: false,
      }),
    });
    const status = await new ReleaseService(repository as never, request).getStatus();
    expect(status).toMatchObject({ latestVersion: "v9.0.0", updateAvailable: true, notes: "Important fixes" });
    expect(request).toHaveBeenCalledOnce();
  });
});
