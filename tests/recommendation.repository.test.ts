import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  return { insert, values, onConflictDoUpdate };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ db: { insert: database.insert } }));

import { recommendationRefreshStates } from "@/server/db/schema";
import { RecommendationRepository } from "@/server/db/repositories/recommendation.repository";

describe("RecommendationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts a deferred refresh when the user has no refresh state yet", async () => {
    const refreshAfter = new Date("2026-08-31T12:15:00.000Z");

    await new RecommendationRepository().invalidateRefresh("00000000-0000-4000-8000-000000000001", refreshAfter);

    expect(database.insert).toHaveBeenCalledWith(recommendationRefreshStates);
    expect(database.values).toHaveBeenCalledWith(expect.objectContaining({
      userId: "00000000-0000-4000-8000-000000000001",
      signalFingerprint: expect.stringMatching(/^pending:/),
      refreshAfter,
      updatedAt: expect.any(Date),
    }));
    expect(database.onConflictDoUpdate).toHaveBeenCalledWith({
      target: recommendationRefreshStates.userId,
      set: expect.objectContaining({
        signalFingerprint: expect.stringMatching(/^pending:/),
        refreshAfter,
        updatedAt: expect.any(Date),
      }),
    });
  });
});
