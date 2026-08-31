export type DateFormat = "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy";
export type TimeFormat = "24h" | "12h";

export function formatDisplayDate(date: Date, format: string) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (format === "dd-mm-yyyy") return `${day}-${month}-${year}`;
  if (format === "mm-dd-yyyy") return `${month}-${day}-${year}`;
  return `${year}-${month}-${day}`;
}

export function formatDisplayTime(date: Date, format: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: format === "12h" }).format(date);
}

export function formatRelativeDate(date: Date, now: Date, locale: string, fallbackFormat: string) {
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDifference = Math.round((startOfDate - startOfToday) / 86_400_000);
  if (Math.abs(dayDifference) <= 7) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(dayDifference, "day");
  return formatDisplayDate(date, fallbackFormat);
}

export function formatRelativeDateTime(date: Date, now: Date, locale: string, dateFormat: string, timeFormat: string) {
  return `${formatRelativeDate(date, now, locale, dateFormat)} · ${formatDisplayTime(date, timeFormat, locale)}`;
}
