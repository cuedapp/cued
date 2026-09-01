import { describe, expect, it } from "vitest";
import { calculateSeriesCompletion } from "@/server/application/series-completion";

describe("calculateSeriesCompletion", () => {
  it("counts released episodes and excludes future episodes", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    expect(
      calculateSeriesCompletion(
        [
          { played: true, premiereDate: new Date("2026-08-20T00:00:00Z") },
          { played: false, premiereDate: new Date("2026-08-21T00:00:00Z") },
          { played: true, premiereDate: new Date("2026-09-01T00:00:00Z") },
        ],
        now,
      ),
    ).toEqual({ played: 1, released: 2, percentage: 50 });
  });

  it("returns zero completion when no episodes have been released", () => {
    expect(calculateSeriesCompletion([], new Date())).toEqual({ played: 0, released: 0, percentage: 0 });
  });
});
