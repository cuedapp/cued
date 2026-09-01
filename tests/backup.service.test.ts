import { describe, expect, it } from "vitest";
import { userExportSchema } from "@/server/application/backup-format";

const archive = {
  format: "cued-user-export" as const,
  version: 1 as const,
  exportedAt: "2026-08-30T08:00:00.000Z",
  preferences: { dateFormat: "yyyy-mm-dd" as const, timeFormat: "24h" as const },
  tasteProfile: null,
  feedback: [
    { mediaType: "movie" as const, tmdbId: 42, rating: 5, feedback: "Great mystery", tags: ["smart"], excluded: false },
  ],
  follows: [],
};

describe("user backup archive", () => {
  it("accepts the portable archive format", () => {
    expect(userExportSchema.parse(archive)).toMatchObject(archive);
  });

  it("rejects archives from an unsupported format version", () => {
    expect(() => userExportSchema.parse({ ...archive, version: 2 })).toThrow();
  });
});
