"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function DashboardGreeting() {
  const t = useTranslations("Dashboard");
  const [hour, setHour] = useState<number>();
  useEffect(() => { const timeout = window.setTimeout(() => setHour(new Date().getHours()), 0); return () => window.clearTimeout(timeout); }, []);
  const key = hour === undefined ? "evening" : hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return <>{t(`greeting.${key}`)}<span className="text-primary">.</span></>;
}
