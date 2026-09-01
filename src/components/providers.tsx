"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isTheme, themeCookieName, themeStorageKey, type Theme } from "@/lib/theme";
import { Toaster } from "sonner";

interface ThemeContextValue {
  theme: Theme;
  setTheme(theme: Theme): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeChangeEvent = "cued-theme-change";

function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const cookieTheme = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${themeCookieName}=`))
    ?.split("=")[1];
  if (isTheme(cookieTheme)) return cookieTheme;
  const stored = window.localStorage.getItem(themeStorageKey);
  return isTheme(stored) ? stored : "system";
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
  document.documentElement.style.colorScheme = resolved;
}

function subscribeToTheme(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(themeChangeEvent, callback);
  mediaQuery.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(themeChangeEvent, callback);
    mediaQuery.removeEventListener("change", callback);
  };
}

export function Providers({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getTheme, () => initialTheme);
  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(themeStorageKey, nextTheme);
    document.cookie = `${themeCookieName}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster theme={theme} richColors closeButton position="top-right" />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within Providers");
  return context;
}
