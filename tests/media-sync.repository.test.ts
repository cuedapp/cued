import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const returning = vi.fn();
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  return { insert, values, onConflictDoUpdate, returning };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ db: { insert: database.insert } }));
vi.mock("@/server/db/repositories/auth.repository", () => ({ AuthRepository: class {} }));

import { mediaItems } from "@/server/db/schema";
import { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";

describe("MediaSyncRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.returning.mockResolvedValue([{ id: "existing-item" }]);
  });

  it("restores an archived title through the existing Jellyfin identity", async () => {
    const repository = new MediaSyncRepository();
    await repository.upsertItems("integration", "library", [{ id: "jellyfin-item", kind: "movie", name: "Returned title", raw: {}, externalIds: { Tmdb: "42" } }]);

    expect(database.insert).toHaveBeenCalledWith(mediaItems);
    expect(database.values).toHaveBeenCalledWith([expect.objectContaining({
      integrationId: "integration",
      jellyfinItemId: "jellyfin-item",
      removedAt: null,
    })]);
    expect(database.onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      target: [mediaItems.integrationId, mediaItems.jellyfinItemId],
      set: expect.objectContaining({ removedAt: null }),
    }));
  });
});
