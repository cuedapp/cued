export type RecommendationAvailability = "all" | "jellyfin" | "strm" | "m3u" | "unavailable";

type RecommendationAvailabilityState = {
  available: boolean;
  strmAvailable: boolean;
  m3uAvailable: boolean;
};

export function matchesRecommendationAvailability(
  item: RecommendationAvailabilityState,
  availability: RecommendationAvailability,
) {
  if (availability === "all") return true;
  if (availability === "jellyfin") return item.available;
  if (availability === "strm") return item.strmAvailable;
  if (availability === "m3u") return item.m3uAvailable && !item.available && !item.strmAvailable;
  return !item.available && !item.strmAvailable && !item.m3uAvailable;
}
