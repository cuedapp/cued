import { describe, expect, it } from "vitest";
import { formatDisplayDate, formatRelativeDate, formatRelativeDateTime, isDateOnlyBeforeToday } from "@/lib/date-time";

describe("display date formatting", () => {
  const date = new Date(2026, 7, 24, 12);
  it("defaults to ISO-style dates", () => expect(formatDisplayDate(date, "yyyy-mm-dd")).toBe("2026-08-24"));
  it("supports day-first dates", () => expect(formatDisplayDate(date, "dd-mm-yyyy")).toBe("24-08-2026"));
  it("supports month-first dates", () => expect(formatDisplayDate(date, "mm-dd-yyyy")).toBe("08-24-2026"));
  it("supports readable European dates", () =>
    expect(formatDisplayDate(new Date(2024, 1, 2, 12), "dd-month-yyyy", "en")).toBe("2 February 2024"));
  it("localizes the month name in readable dates", () =>
    expect(formatDisplayDate(new Date(2024, 1, 2, 12), "dd-month-yyyy", "sv")).toBe("2 februari 2024"));
  it("supports readable month-first dates", () =>
    expect(formatDisplayDate(new Date(2024, 1, 2, 12), "month-dd-yyyy", "en")).toBe("February 2, 2024"));
  it("treats only dates before today as already released", () => {
    const today = new Date(2024, 1, 2, 9);
    expect(isDateOnlyBeforeToday("2024-02-01", today)).toBe(true);
    expect(isDateOnlyBeforeToday("2024-02-02", today)).toBe(false);
    expect(isDateOnlyBeforeToday("2024-02-03", today)).toBe(false);
  });
  it("uses readable relative dates for recent activity", () =>
    expect(formatRelativeDate(date, new Date(2026, 7, 27, 12), "en", "yyyy-mm-dd")).toBe("3 days ago"));
  it("falls back to the selected exact format for older activity", () =>
    expect(formatRelativeDate(date, new Date(2026, 8, 10, 12), "en", "dd-mm-yyyy")).toBe("24-08-2026"));
  it("combines a readable activity date with the selected time format", () =>
    expect(
      formatRelativeDateTime(new Date(2026, 7, 26, 20, 5), new Date(2026, 7, 27, 12), "en", "yyyy-mm-dd", "24h"),
    ).toBe("yesterday · 20:05"));
});
