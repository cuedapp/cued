import { describe, expect, it, vi } from "vitest";
import { LibraryService } from "@/server/application/library.service";
import type { LibraryRepository } from "@/server/db/repositories/library.repository";

describe("LibraryService", () => {
  it("keeps removed titles in the catalog and maps their discovery fields", async () => {
    const removedAt = new Date("2026-08-30T10:00:00.000Z");
    const repository = { list: vi.fn().mockResolvedValue({ total: 1, items: [{
      id: "item", tmdbId: 42, kind: "movie", name: "Archived title", premiereDate: new Date("2001-01-01T00:00:00.000Z"),
      raw: { Overview: "Still worth discovering", Genres: ["Mystery", "Drama"] }, removedAt,
    }] }) } as unknown as LibraryRepository;

    const result = await new LibraryService(repository).list("user", { type: "all", state: "removed" }, 1);

    expect(repository.list).toHaveBeenCalledWith("user", { type: "all", state: "removed" }, 1, 24);
    expect(result.items).toEqual([expect.objectContaining({
      tmdbId: 42,
      mediaType: "movie",
      title: "Archived title",
      year: 2001,
      overview: "Still worth discovering",
      reasons: ["Mystery", "Drama"],
      removedAt: removedAt.toISOString(),
    })]);
  });

  it("clamps pages beyond the final catalog page", async () => {
    const repository = { list: vi.fn()
      .mockResolvedValueOnce({ total: 25, items: [] })
      .mockResolvedValueOnce({ total: 25, items: [] }) } as unknown as LibraryRepository;

    const result = await new LibraryService(repository).list("user", { type: "movie", state: "active" }, 99);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(repository.list).toHaveBeenLastCalledWith("user", { type: "movie", state: "active" }, 2, 24);
  });
});
