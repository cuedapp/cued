"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type RecommendationStatus = {
  needsRefresh: boolean;
  run?: {
    id: string;
    status: string;
    phase: string;
    processedItems: number;
    totalItems: number;
    error?: string | null;
  };
};

export type AppJob = {
  id: string;
  label: "recommendations" | "jellyfin" | "strm" | "mediaRatings" | "m3u";
  href: string;
};

export type AppNotification = {
  id: string;
  category: string;
  message: string;
  details: Record<string, string> | null;
  href?: string | null;
  createdAt: string;
  readAt: string | null;
};

export type BootstrapStatus = {
  status: "pending" | "running" | "failed" | "completed";
  phase: "waiting" | "syncing" | "recommendations" | "ready";
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

type AppStatus = {
  recommendations: RecommendationStatus;
  jobs: AppJob[];
  notifications: AppNotification[];
  bootstrap?: BootstrapStatus;
};

type AppStatusContextValue = {
  status?: AppStatus;
  refresh(): Promise<void>;
};

const AppStatusContext = createContext<AppStatusContextValue | null>(null);

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>();
  const request = useRef<AbortController | undefined>(undefined);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current || document.visibilityState !== "visible") return;
    inFlight.current = true;
    request.current?.abort();
    request.current = new AbortController();
    try {
      const response = await fetch("/api/status", { cache: "no-store", signal: request.current.signal });
      if (!response.ok) return;
      setStatus((await response.json()) as AppStatus);
    } catch {
      // Retain the last known status while the server is unavailable.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(
      () => void refresh(),
      status?.bootstrap?.status === "running" ||
        status?.recommendations.run?.status === "running" ||
        status?.jobs.length
        ? 2_500
        : 10_000,
    );
    return () => {
      request.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refresh, status?.bootstrap?.status, status?.jobs.length, status?.recommendations.run?.status]);

  const value = useMemo(() => ({ status, refresh }), [refresh, status]);
  return <AppStatusContext.Provider value={value}>{children}</AppStatusContext.Provider>;
}

export function useAppStatus() {
  const context = useContext(AppStatusContext);
  if (!context) throw new Error("useAppStatus must be used within AppStatusProvider");
  return context;
}
