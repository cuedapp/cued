export type RecommendationSort = "match" | "latest" | "rating" | "popularity" | "year" | "title";

type SortableRecommendation = {
  matchPercent: number;
  score: number;
  rating: number;
  voteCount: number;
  popularity: number;
  generatedAt: Date;
  releaseDate: string | null;
  title: string;
};

export function sortRecommendations<T extends SortableRecommendation>(items: T[], sort: RecommendationSort): T[] {
  return [...items].sort((left, right) => {
    if (sort === "latest") return right.generatedAt.getTime() - left.generatedAt.getTime() || compareMatch(left, right);
    if (sort === "rating")
      return right.rating - left.rating || right.voteCount - left.voteCount || compareMatch(left, right);
    if (sort === "popularity") return right.popularity - left.popularity || compareMatch(left, right);
    if (sort === "year")
      return (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "") || compareMatch(left, right);
    if (sort === "title") return left.title.localeCompare(right.title);
    return compareMatch(left, right);
  });
}

function compareMatch(left: SortableRecommendation, right: SortableRecommendation) {
  return right.matchPercent - left.matchPercent || right.score - left.score || right.rating - left.rating;
}
