import { describe, expect, it, vi } from "vitest";
import { InProcessJobRunner } from "@/server/jobs/runner";

describe("InProcessJobRunner", () => {
  it("runs a job and returns an execution record", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const result = await new InProcessJobRunner().execute({ name: "foundation-test", run });
    expect(run).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ jobName: "foundation-test", status: "completed" });
  });

  it("captures job failures without leaving the job locked", async () => {
    const runner = new InProcessJobRunner();
    const failed = await runner.execute({ name: "retryable", run: vi.fn().mockRejectedValue(new Error("boom")) });
    const recovered = await runner.execute({ name: "retryable", run: vi.fn().mockResolvedValue(undefined) });
    expect(failed).toMatchObject({ status: "failed", error: "boom" });
    expect(recovered.status).toBe("completed");
  });
});
