export const contentRatingAges = [0, 3, 6, 7, 9, 11, 12, 13, 14, 15, 16, 17, 18] as const;
export const contentRatingLimitAges = contentRatingAges.filter((age) => age < 18);

export type ContentRatingAge = (typeof contentRatingAges)[number];

export function parseContentRatingAge(value: string | null | undefined): ContentRatingAge | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return contentRatingAges.includes(parsed as ContentRatingAge) ? (parsed as ContentRatingAge) : null;
}

export function displayContentRating(age: number | null | undefined, allAgesLabel: string): string | null {
  if (age === null || age === undefined) return null;
  return age === 0 ? allAgesLabel : `${age}+`;
}

/**
 * Convert common country-specific certification labels to Cued's deliberately
 * conservative, portable age buckets. The source label is still retained for
 * display; this value exists so filtering behaves consistently.
 */
export function normalizeContentRating(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const rating = value.trim().toUpperCase().replaceAll("_", "-");
  if (!rating || ["NR", "N/A", "UNRATED", "NOT RATED", "UR"].includes(rating)) return null;

  if (["G", "TV-Y", "TV-G", "U", "AL", "ALL", "0", "L", "BTL"].includes(rating) || rating.endsWith("-BTL")) return 0;
  if (["PG", "TV-Y7", "TV-Y7-FV", "TP"].includes(rating)) return 7;
  if (["TV-PG"].includes(rating)) return 7;
  if (["PG-13", "SAM 13"].includes(rating)) return 13;
  if (["TV-14"].includes(rating)) return 14;
  if (["R"].includes(rating)) return 17;
  if (["TV-MA", "NC-17", "X", "R18", "R18+", "K-18"].includes(rating)) return 18;

  const age = rating.match(/(?:^|[^0-9])(\d{1,2})(?:\+|[^0-9]|$)/)?.[1];
  if (!age) return null;
  const parsed = Number(age);
  if (parsed >= 0 && parsed <= 18) return parsed;
  return null;
}

export function contentRatingLabel(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function lowestContentRating(
  ratings: Array<{ label?: string | null; age?: number | null }>,
): { label: string; age: number } | null {
  return (
    ratings
      .flatMap((rating) => {
        const label = contentRatingLabel(rating.label);
        const age = rating.age ?? normalizeContentRating(label);
        return label && age !== null ? [{ label, age }] : [];
      })
      .sort((left, right) => left.age - right.age)[0] ?? null
  );
}
