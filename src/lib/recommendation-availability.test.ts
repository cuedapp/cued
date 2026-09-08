import { describe, expect, it } from "vitest";
import { matchesRecommendationAvailability } from "./recommendation-availability";

describe("matchesRecommendationAvailability", () => {
  it("excludes Jellyfin titles from the M3U-only filter", () => {
    expect(
      matchesRecommendationAvailability({ available: true, strmAvailable: false, m3uAvailable: true }, "m3u"),
    ).toBe(false);
  });

  it("excludes imported STRM titles from the M3U-only filter", () => {
    expect(
      matchesRecommendationAvailability({ available: false, strmAvailable: true, m3uAvailable: true }, "m3u"),
    ).toBe(false);
  });

  it("includes M3U sources that are not yet available in Jellyfin", () => {
    expect(
      matchesRecommendationAvailability({ available: false, strmAvailable: false, m3uAvailable: true }, "m3u"),
    ).toBe(true);
  });
});
