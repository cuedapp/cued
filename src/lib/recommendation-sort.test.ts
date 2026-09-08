import { describe, expect, it } from "vitest";
import { sortRecommendations, type RecommendationSort } from "./recommendation-sort";

const base = {
  score: 50,
  rating: 7,
  voteCount: 100,
  popularity: 10,
  generatedAt: new Date("2026-01-01T00:00:00Z"),
  releaseDate: "2020-01-01",
};

function item(title: string, values: Partial<Omit<typeof base, "title"> & { matchPercent: number }> = {}) {
  return { ...base, matchPercent: 50, title, ...values };
}

describe("sortRecommendations", () => {
  it("sorts best match numerically without evidence-group ordering", () => {
    expect(
      sortRecommendations([item("Lower", { matchPercent: 72 }), item("Higher", { matchPercent: 91 })], "match"),
    ).toMatchObject([{ title: "Higher" }, { title: "Lower" }]);
  });

  it.each<[RecommendationSort, string]>([
    ["latest", "New"],
    ["rating", "High"],
    ["popularity", "Popular"],
    ["year", "Recent"],
    ["title", "Alpha"],
  ])("sorts %s recommendations", (sort, expected) => {
    const candidates = [
      item("Old", { generatedAt: new Date("2025-01-01T00:00:00Z") }),
      item("New", { generatedAt: new Date("2026-02-01T00:00:00Z") }),
      item("High", { rating: 9 }),
      item("Popular", { popularity: 99 }),
      item("Recent", { releaseDate: "2026-03-01" }),
      item("Alpha"),
    ];

    expect(sortRecommendations(candidates, sort)[0]?.title).toBe(expected);
  });
});
