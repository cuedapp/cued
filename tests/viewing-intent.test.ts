import { describe, expect, it } from "vitest";
import { rankForViewingIntent, viewingIntentPresetGenres, type IntentRecommendation } from "@/lib/viewing-intent";

const items: IntentRecommendation[] = [
  {
    mediaType: "series",
    title: "Slow Mystery",
    overview: "A clever puzzle unfolds.",
    reasons: ["Drama"],
    genreIds: [18, 9648],
    score: 90,
    matchPercent: 91,
  },
  {
    mediaType: "movie",
    title: "Fast Escape",
    overview: "An action adventure.",
    reasons: ["Action"],
    genreIds: [28, 12],
    score: 75,
    matchPercent: 80,
  },
  {
    mediaType: "movie",
    title: "Laugh Tonight",
    overview: "A warm funny comedy.",
    reasons: ["Comedy"],
    genreIds: [35],
    score: 70,
    matchPercent: 78,
  },
];

describe("viewing intent ranking", () => {
  it("immediately narrows to matching preset terms without mutating the persisted recommendation list", () => {
    const ranked = rankForViewingIntent(items, { presets: ["action"], text: "" });

    expect(ranked.map((item) => item.title)).toEqual(["Fast Escape"]);
    expect(items.map((item) => item.title)).toEqual(["Slow Mystery", "Fast Escape", "Laugh Tonight"]);
  });

  it("prioritizes the requested media type", () => {
    expect(rankForViewingIntent(items, { presets: ["movieTonight"], text: "" })[0]?.mediaType).toBe("movie");
    expect(rankForViewingIntent(items, { presets: ["startSeries"], text: "" })[0]?.mediaType).toBe("series");
  });

  it("uses free-text terms against recommendation metadata", () => {
    expect(rankForViewingIntent(items, { presets: [], text: "funny" }).map((item) => item.title)).toEqual([
      "Laugh Tonight",
    ]);
  });

  it("combines selected tags", () => {
    expect(rankForViewingIntent(items, { presets: ["action", "movieTonight"], text: "" })[0]?.title).toBe(
      "Fast Escape",
    );
  });

  it("matches localized metadata by stable TMDB genre IDs", () => {
    const localized = {
      ...items[0]!,
      title: "Lokal titel",
      overview: "Lokal beskrivning",
      reasons: [],
      genreIds: [16],
    };
    expect(rankForViewingIntent([localized], { presets: ["animation"], text: "" })).toEqual([localized]);
  });

  it("keeps exact library genre presets distinct", () => {
    expect(viewingIntentPresetGenres.animation).toContain("animation");
    expect(viewingIntentPresetGenres.animation).not.toContain("family");
    expect(viewingIntentPresetGenres.animation).not.toContain("comedy");
  });
});
