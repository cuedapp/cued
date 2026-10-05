export const seasonalThemes = [
  { id: "christmas", keyword: "Christmas" },
  { id: "halloween", keyword: "Halloween" },
  { id: "valentines-day", keyword: "Valentine's Day" },
  { id: "easter", keyword: "Easter" },
  { id: "thanksgiving", keyword: "Thanksgiving" },
  { id: "summer", keyword: "summer" },
] as const;

export type SeasonalThemeId = (typeof seasonalThemes)[number]["id"];

export function isSeasonalThemeId(value: unknown): value is SeasonalThemeId {
  return typeof value === "string" && seasonalThemes.some((theme) => theme.id === value);
}

export function getSeasonalTheme(id: string | undefined) {
  return seasonalThemes.find((theme) => theme.id === id);
}
