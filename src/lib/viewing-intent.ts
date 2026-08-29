export const viewingIntentPresets = ["easyWatch", "action", "clever", "lightFunny", "comfort", "suspense", "romance", "fantasy", "scary", "documentary", "animation", "family", "movieTonight", "startSeries", "surpriseMe"] as const;

export type ViewingIntentPreset = (typeof viewingIntentPresets)[number];

export type ViewingIntent = {
  presets: ViewingIntentPreset[];
  text: string;
};

export type IntentRecommendation = {
  mediaType: string;
  title: string;
  overview: string;
  reasons: string[];
  genreIds: number[];
  matchPercent: number;
  score: number;
};

const movieGenreIds = new Set([28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37]);
const presetTerms: Record<Exclude<ViewingIntentPreset, "movieTonight" | "startSeries" | "surpriseMe">, string[]> = {
  easyWatch: ["comedy", "family", "animation", "romance", "feel good", "fun", "light", "easy", "comfort"],
  action: ["action", "adventure", "thriller", "crime", "war", "western", "exciting"],
  clever: ["mystery", "science fiction", "sci fi", "documentary", "history", "smart", "clever", "mind"],
  lightFunny: ["comedy", "family", "animation", "fun", "funny", "light", "feel good"],
  comfort: ["comedy", "family", "animation", "romance", "feel good", "comfort", "warm"],
  suspense: ["thriller", "mystery", "crime", "suspense", "tension"],
  romance: ["romance", "romantic", "love", "relationship"],
  fantasy: ["fantasy", "science fiction", "sci fi", "adventure", "magic"],
  scary: ["horror", "scary", "supernatural", "terror"],
  documentary: ["documentary", "history", "biography", "music"],
  animation: ["animation", "animated", "family", "comedy"],
  family: ["family", "animation", "animated", "adventure", "comedy", "fantasy"],
};

export function rankForViewingIntent<T extends IntentRecommendation>(items: readonly T[], intent: ViewingIntent): T[] {
  if (intent.presets.length === 0 && !intent.text.trim()) return [...items].sort(compareBase);
  const terms = [...intent.presets.flatMap((preset) => preset in presetTerms ? presetTerms[preset as keyof typeof presetTerms] : []), ...tokenize(intent.text)];
  return items
    .map((item, index) => ({ item, index, boost: intentBoost(item, intent.presets, terms) }))
    .sort((left, right) => right.boost - left.boost || compareBase(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

function intentBoost(item: IntentRecommendation, presets: ViewingIntentPreset[], terms: string[]) {
  const searchable = ` ${normalize([item.title, item.overview, ...item.reasons].join(" "))} `;
  const termMatches = terms.reduce((total, term) => total + (searchable.includes(` ${normalize(term)} `) ? 1 : 0), 0);
  const typeBoost = (presets.includes("movieTonight") && item.mediaType === "movie" ? 12 : 0)
    + (presets.includes("startSeries") && item.mediaType === "series" ? 12 : 0);
  const surpriseBoost = presets.includes("surpriseMe") ? surpriseScore(item) : 0;
  return termMatches * 8 + typeBoost + surpriseBoost;
}

function surpriseScore(item: IntentRecommendation) {
  const genreVariety = new Set(item.genreIds).size;
  const movieBonus = item.mediaType === "movie" && movieGenreIds.intersection(new Set(item.genreIds)).size > 0 ? 2 : 0;
  return Math.min(8, genreVariety * 2 + movieBonus) + Math.min(5, Math.round(item.matchPercent / 20));
}

function compareBase(a: IntentRecommendation, b: IntentRecommendation) {
  return b.score - a.score || b.matchPercent - a.matchPercent;
}

function tokenize(value: string) {
  return normalize(value).split(" ").filter((term) => term.length >= 3).slice(0, 8);
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}