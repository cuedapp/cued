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
const presetGenres: Partial<Record<ViewingIntentPreset, number[]>> = {
  easyWatch: [35, 10751, 16, 10749], action: [28, 12, 53, 80, 10752, 37], clever: [9648, 878, 99, 36],
  lightFunny: [35, 10751, 16], comfort: [35, 10751, 16, 10749], suspense: [53, 9648, 80], romance: [10749],
  fantasy: [14, 878, 12], scary: [27], documentary: [99, 36, 10402], animation: [16], family: [10751, 16],
};
export const viewingIntentPresetTerms: Record<Exclude<ViewingIntentPreset, "movieTonight" | "startSeries" | "surpriseMe">, string[]> = {
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

export const viewingIntentPresetGenres: Record<Exclude<ViewingIntentPreset, "movieTonight" | "startSeries" | "surpriseMe">, string[]> = {
  easyWatch: ["comedy", "family", "animation", "komedi", "familj", "animerat", "komedie", "familie", "animatie"],
  action: ["action", "actie"],
  clever: ["mystery", "science fiction", "documentary", "mysterium", "dokumentär", "mysterie", "documentaire"],
  lightFunny: ["comedy", "komedi", "komedie"],
  comfort: ["comedy", "family", "romance", "komedi", "familj", "romantik", "komedie", "familie", "romantiek"],
  suspense: ["thriller", "mystery", "mysterium", "mysterie"],
  romance: ["romance", "romantik", "romantiek"],
  fantasy: ["fantasy", "fantasi"],
  scary: ["horror", "skräck"],
  documentary: ["documentary", "dokumentär", "documentaire"],
  animation: ["animation", "animerat", "animatie"],
  family: ["family", "familj", "familie"],
};

export function rankForViewingIntent<T extends IntentRecommendation>(items: readonly T[], intent: ViewingIntent): T[] {
  if (intent.presets.length === 0 && !intent.text.trim()) return [...items].sort(compareBase);
  const textTerms = tokenize(intent.text);
  const terms = [...intent.presets.flatMap((preset) => preset in viewingIntentPresetTerms ? viewingIntentPresetTerms[preset as keyof typeof viewingIntentPresetTerms] : []), ...textTerms];
  const ranked = items
    .filter((item) => matchesIntent(item, intent.presets, textTerms))
    .map((item, index) => ({ item, index, boost: intentBoost(item, intent.presets, terms) }))
    .sort((left, right) => right.boost - left.boost || compareBase(left.item, right.item) || left.index - right.index);
  return ranked.map(({ item }) => item);
}

function matchesIntent(item: IntentRecommendation, presets: ViewingIntentPreset[], textTerms: string[]) {
  const movieOnly = presets.includes("movieTonight") && !presets.includes("startSeries");
  const seriesOnly = presets.includes("startSeries") && !presets.includes("movieTonight");
  if (movieOnly && item.mediaType !== "movie" || seriesOnly && item.mediaType !== "series") return false;
  const searchable = ` ${normalize([item.title, item.overview, ...item.reasons].join(" "))} `;
  const moodPresets = presets.filter((preset) => preset in viewingIntentPresetTerms);
  const moodMatch = moodPresets.length === 0 || moodPresets.some((preset) =>
    presetGenres[preset]?.some((genre) => item.genreIds.includes(genre))
    || viewingIntentPresetTerms[preset as keyof typeof viewingIntentPresetTerms].some((term) => searchable.includes(` ${normalize(term)} `)));
  const textMatch = textTerms.length === 0 || textTerms.some((term) => searchable.includes(` ${normalize(term)} `));
  return moodMatch && textMatch;
}

function intentBoost(item: IntentRecommendation, presets: ViewingIntentPreset[], terms: string[]) {
  const searchable = ` ${normalize([item.title, item.overview, ...item.reasons].join(" "))} `;
  const termMatches = terms.reduce((total, term) => total + (searchable.includes(` ${normalize(term)} `) ? 1 : 0), 0);
  const genreMatches = presets.reduce((total, preset) => total + (presetGenres[preset]?.some((genre) => item.genreIds.includes(genre)) ? 1 : 0), 0);
  const typeBoost = (presets.includes("movieTonight") && item.mediaType === "movie" ? 12 : 0)
    + (presets.includes("startSeries") && item.mediaType === "series" ? 12 : 0);
  const surpriseBoost = presets.includes("surpriseMe") ? surpriseScore(item) : 0;
  return termMatches * 8 + genreMatches * 10 + typeBoost + surpriseBoost;
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
