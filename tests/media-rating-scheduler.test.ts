import { describe, expect, it, vi } from "vitest";
import { runMediaRatingSync } from "@/server/jobs/media-rating-scheduler";

describe("runMediaRatingSync", () => {
  it("notifies administrators when a batch imports ratings", async () => {
    const ratings = { enrichDue: vi.fn().mockResolvedValue({ checked: 50, enriched: 48, failed: 0, completed: true }) };
    const notifications = { notifyAdmins: vi.fn() };

    await expect(runMediaRatingSync(ratings, notifications)).resolves.toEqual({
      checked: 50,
      enriched: 48,
      failed: 0,
      completed: true,
    });
    expect(notifications.notifyAdmins).toHaveBeenCalledWith("ratings.completed", "/library");
  });

  it("keeps intermediate batches quiet and notifies administrators about failures", async () => {
    const notifications = { notifyAdmins: vi.fn() };
    await runMediaRatingSync(
      { enrichDue: vi.fn().mockResolvedValue({ checked: 50, enriched: 50, failed: 0, completed: false }) },
      notifications,
    );
    expect(notifications.notifyAdmins).not.toHaveBeenCalled();

    const failure = new Error("provider failed");
    await expect(runMediaRatingSync({ enrichDue: vi.fn().mockRejectedValue(failure) }, notifications)).rejects.toBe(
      failure,
    );
    expect(notifications.notifyAdmins).toHaveBeenCalledWith("ratings.failed", "/library");
  });
});
