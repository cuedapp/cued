import { describe, expect, it } from "vitest";
import {
  buildGenreTaste,
  scoreCandidates,
  type RecommendationSignal,
} from "@/server/application/recommendation-scoring";

const signals: RecommendationSignal[] = [
  {
    tmdbId: 1,
    type: "movie",
    rating: 5,
    played: true,
    playedPercentage: 100,
    excluded: false,
    genres: [{ id: 28, name: "Action" }],
  },
  {
    tmdbId: 2,
    type: "movie",
    rating: 1,
    played: true,
    playedPercentage: 100,
    excluded: false,
    genres: [{ id: 27, name: "Horror" }],
  },
];

describe("recommendation scoring", () => {
  it("weights explicit ratings more strongly than inferred engagement", () => {
    const taste = buildGenreTaste(signals);
    expect(taste.get(28)?.weight).toBe(4);
    expect(taste.get(27)?.weight).toBe(-4);
  });

  it("filters watched titles and prioritizes candidates matching positive genres", () => {
    const candidates = [
      {
        id: 1,
        type: "movie" as const,
        title: "Seen",
        overview: "",
        genreIds: [28],
        rating: 9,
        voteCount: 1000,
        popularity: 100,
      },
      {
        id: 10,
        type: "movie" as const,
        title: "Action candidate",
        overview: "",
        genreIds: [28],
        rating: 7,
        voteCount: 500,
        popularity: 20,
      },
      {
        id: 11,
        type: "movie" as const,
        title: "Horror candidate",
        overview: "",
        genreIds: [27],
        rating: 8,
        voteCount: 500,
        popularity: 20,
      },
    ];
    const scored = scoreCandidates(candidates, signals);
    expect(scored.map((item) => item.id)).toEqual([10, 11]);
    expect(scored[0]?.reasons).toEqual(["Action"]);
    expect(scored[0]!.score).toBeGreaterThan(scored[1]!.score);
  });

  it("filters watched titles outside the limited taste-signal set", () => {
    const candidates = [
      {
        id: 10,
        type: "movie" as const,
        title: "Previously watched",
        overview: "",
        genreIds: [28],
        rating: 8,
        voteCount: 500,
        popularity: 20,
      },
    ];
    expect(scoreCandidates(candidates, signals, new Map(), new Set(["movie:10"]))).toEqual([]);
  });

  it("boosts candidates recommended from a strongly liked title", () => {
    const candidates = [
      {
        id: 10,
        type: "movie" as const,
        title: "Direct match",
        overview: "",
        genreIds: [28],
        rating: 7,
        voteCount: 500,
        popularity: 20,
      },
      {
        id: 11,
        type: "movie" as const,
        title: "Genre match",
        overview: "",
        genreIds: [28],
        rating: 7,
        voteCount: 500,
        popularity: 20,
      },
    ];
    const scored = scoreCandidates(
      candidates,
      signals,
      new Map(),
      new Set(),
      new Map([["movie:10", [{ id: 1, type: "movie", title: "Seed", reason: "liked" }]]]),
    );
    expect(scored[0]?.id).toBe(10);
    expect(scored[0]!.matchPercent).toBeGreaterThan(scored[1]!.matchPercent);
    expect(scored[0]!.matchPercent).toBeLessThan(99);
  });

  it("does not dilute a strong genre match as the taste profile grows", () => {
    const expandedSignals: RecommendationSignal[] = [
      ...signals,
      ...Array.from({ length: 12 }, (_, index): RecommendationSignal => ({
        tmdbId: 100 + index,
        type: "movie",
        rating: 5,
        played: true,
        playedPercentage: 100,
        excluded: false,
        genres: [{ id: 100 + index, name: `Genre ${index}` }],
      })),
    ];
    const [candidate] = scoreCandidates(
      [
        {
          id: 10,
          type: "movie",
          title: "Action match",
          overview: "",
          genreIds: [28],
          rating: 8,
          voteCount: 1_000,
          popularity: 20,
        },
      ],
      expandedSignals,
    );
    expect(candidate?.matchPercent).toBeGreaterThanOrEqual(80);
  });

  it("blends existing scores to reduce unnecessary recommendation churn", () => {
    const [scored] = scoreCandidates(
      [
        {
          id: 10,
          type: "movie",
          title: "Candidate",
          overview: "",
          genreIds: [28],
          rating: 7,
          voteCount: 500,
          popularity: 20,
        },
      ],
      signals,
      new Map([["movie:10", 100]]),
    );
    expect(scored?.score).toBeGreaterThan(70);
  });

  it("discards legacy unbounded scores instead of letting genre totals dominate", () => {
    const [scored] = scoreCandidates(
      [
        {
          id: 10,
          type: "movie",
          title: "Candidate",
          overview: "",
          genreIds: [28],
          rating: 7,
          voteCount: 500,
          popularity: 20,
        },
      ],
      signals,
      new Map([["movie:10", 1_200]]),
    );
    expect(scored?.score).toBeLessThan(150);
  });
});
