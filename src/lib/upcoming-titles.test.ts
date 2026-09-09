import { describe, expect, it } from "vitest";
import { mergeUpcomingTitles } from "./upcoming-titles";

describe("mergeUpcomingTitles", () => {
  it("deduplicates titles and preserves their related follow sources", () => {
    expect(
      mergeUpcomingTitles([
        {
          id: 10,
          type: "movie",
          title: "Example",
          date: "2026-09-12",
          sources: [],
          sourceFollowIds: [],
          directlyFollowed: true,
        },
        {
          id: 10,
          type: "movie",
          title: "Example",
          date: "2026-09-12",
          sources: ["From Ada"],
          sourceFollowIds: ["source-a"],
          directlyFollowed: false,
        },
        {
          id: 20,
          type: "series",
          title: "Later",
          date: "2026-09-20",
          sources: ["From Collection"],
          sourceFollowIds: ["source-b"],
          directlyFollowed: false,
        },
      ]),
    ).toEqual([
      {
        id: 10,
        type: "movie",
        title: "Example",
        date: "2026-09-12",
        sources: ["From Ada"],
        sourceFollowIds: ["source-a"],
        directlyFollowed: true,
      },
      {
        id: 20,
        type: "series",
        title: "Later",
        date: "2026-09-20",
        sources: ["From Collection"],
        sourceFollowIds: ["source-b"],
        directlyFollowed: false,
      },
    ]);
  });
});
