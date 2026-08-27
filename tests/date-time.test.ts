import { describe, expect, it } from "vitest";
import { formatDisplayDate, formatRelativeDate } from "@/lib/date-time";

describe("display date formatting", () => {
  const date = new Date(2026, 7, 24, 12);
  it("defaults to ISO-style dates", () => expect(formatDisplayDate(date, "yyyy-mm-dd")).toBe("2026-08-24"));
  it("supports day-first dates", () => expect(formatDisplayDate(date, "dd-mm-yyyy")).toBe("24-08-2026"));
  it("supports month-first dates", () => expect(formatDisplayDate(date, "mm-dd-yyyy")).toBe("08-24-2026"));
  it("uses readable relative dates for recent activity", () => expect(formatRelativeDate(date, new Date(2026, 7, 27, 12), "en", "yyyy-mm-dd")).toBe("3 days ago"));
  it("falls back to the selected exact format for older activity", () => expect(formatRelativeDate(date, new Date(2026, 8, 10, 12), "en", "dd-mm-yyyy")).toBe("24-08-2026"));
});
