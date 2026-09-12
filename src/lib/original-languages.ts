export const originalLanguageCodes = [
  "en",
  "sv",
  "nl",
  "da",
  "no",
  "fi",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "pl",
  "ja",
  "ko",
  "zh",
  "hi",
] as const;

export type OriginalLanguageCode = (typeof originalLanguageCodes)[number];

export function defaultOriginalLanguages(locale: string): OriginalLanguageCode[] {
  const localeLanguage = locale.split("-")[0];
  const preferred = originalLanguageCodes.find((language) => language === localeLanguage);
  return [...new Set([preferred, "en"].filter((language): language is OriginalLanguageCode => Boolean(language)))];
}

export function isOriginalLanguageCode(value: string): value is OriginalLanguageCode {
  return originalLanguageCodes.some((language) => language === value);
}
