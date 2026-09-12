"use client";

import { useEffect, useState } from "react";

type Job = { label: string };

export function useActiveJobLabels() {
  const [labels, setLabels] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/jobs/status", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const result = (await response.json()) as { jobs: Job[] };
      setLabels(new Set(result.jobs.map((job) => job.label)));
    };
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
  return labels;
}
