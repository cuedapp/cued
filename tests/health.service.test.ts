import { describe, expect, it, vi } from "vitest";
import { HealthService } from "@/server/application/health.service";

describe("HealthService", () => {
  it("reports healthy when the database responds", async () => {
    const report = await new HealthService(vi.fn().mockResolvedValue(undefined)).check();
    expect(report).toMatchObject({ status: "ok", application: "ok", database: "ok" });
  });

  it("reports degraded when the database fails", async () => {
    const report = await new HealthService(vi.fn().mockRejectedValue(new Error("offline"))).check();
    expect(report).toMatchObject({ status: "degraded", application: "ok", database: "error" });
  });
});
