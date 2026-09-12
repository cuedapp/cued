export type DateFormat = "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy" | "dd-month-yyyy" | "month-dd-yyyy";
export type TimeFormat = "24h" | "12h";

export function formatDisplayDate(date: Date, format: string, locale = "en") {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (format === "dd-mm-yyyy") return `${day}-${month}-${year}`;
  if (format === "mm-dd-yyyy") return `${month}-${day}-${year}`;
  if (format === "dd-month-yyyy" || format === "month-dd-yyyy") {
    const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
    const unpaddedDay = String(date.getDate());
    return format === "dd-month-yyyy" ? `${unpaddedDay} ${monthName} ${year}` : `${monthName} ${unpaddedDay}, ${year}`;
  }
  return `${year}-${month}-${day}`;
}

export function formatLongDate(date: Date, locale: string, dateFormat?: string) {
  if (dateFormat) return formatDisplayDate(date, dateFormat, locale);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isDateOnlyBeforeToday(value: string, now = new Date()) {
  const date = parseDateOnly(value);
  date.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

export function formatDisplayTime(date: Date, format: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: format === "12h" }).format(date);
}

export function formatRelativeDate(date: Date, now: Date, locale: string, fallbackFormat?: string) {
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDifference = Math.round((startOfDate - startOfToday) / 86_400_000);
  if (Math.abs(dayDifference) <= 7)
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(dayDifference, "day");
  return fallbackFormat ? formatDisplayDate(date, fallbackFormat, locale) : formatLongDate(date, locale);
}

export function formatRelativeDateTime(date: Date, now: Date, locale: string, dateFormat: string, timeFormat: string) {
  return `${formatRelativeDate(date, now, locale, dateFormat)} · ${formatDisplayTime(date, timeFormat, locale)}`;
}
