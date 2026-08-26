export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];

export const themeStorageKey = "cued-theme";
export const themeCookieName = themeStorageKey;

export function isTheme(value: string | null | undefined): value is Theme {
  return value !== null && value !== undefined && themes.includes(value as Theme);
}
