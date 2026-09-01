export function formatEstimatedWatchTime(seconds: number) {
  const hours = seconds / 3_600;
  if (hours >= 24 * 14) return { value: round(hours / (24 * 7)), unit: "weeks" as const };
  if (hours >= 24) return { value: round(hours / 24), unit: "days" as const };
  return { value: round(hours), unit: "hours" as const };
}

export function formatActivityWeekday(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
