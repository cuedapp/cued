import { describe, expect, it } from "vitest";
import {
  contentRatingLabel,
  displayContentRating,
  lowestContentRating,
  normalizeContentRating,
  parseContentRatingAge,
} from "./content-rating";

describe("displayContentRating", () => {
  it("uses one normalized display scale", () => {
    expect(displayContentRating(0, "All ages")).toBe("All ages");
    expect(displayContentRating(15, "All ages")).toBe("15+");
    expect(displayContentRating(null, "All ages")).toBeNull();
  });
});

describe("parseContentRatingAge", () => {
  it.each([undefined, null, "", " "])("does not turn an empty value (%s) into an all-ages limit", (value) => {
    expect(parseContentRatingAge(value)).toBeNull();
  });

  it("accepts supported explicit limits", () => {
    expect(parseContentRatingAge("0")).toBe(0);
    expect(parseContentRatingAge("17")).toBe(17);
  });

  it.each(["nope", "8", "19"])("rejects unsupported limit %s", (value) => {
    expect(parseContentRatingAge(value)).toBeNull();
  });
});

describe("normalizeContentRating", () => {
  it.each([
    ["G", 0],
    ["AL", 0],
    ["SE-Btl", 0],
    ["PG", 7],
    ["TV-Y7", 7],
    ["3+", 3],
    ["6", 6],
    ["9", 9],
    ["PG-13", 13],
    ["12A", 12],
    ["TV-14", 14],
    ["R", 17],
    ["16+", 16],
    ["TV-MA", 18],
    ["NC-17", 18],
  ])("maps %s to the %s bucket", (rating, expected) => {
    expect(normalizeContentRating(rating)).toBe(expected);
  });

  it("extracts numeric ages from prefixed country ratings", () => {
    expect(normalizeContentRating("DE-12")).toBe(12);
    expect(normalizeContentRating("FSK 18")).toBe(18);
    expect(normalizeContentRating("SE-Från 11 år")).toBe(11);
  });

  it.each([undefined, null, "", "NR", "Unrated", "unknown"])("leaves %s unrestricted", (rating) => {
    expect(normalizeContentRating(rating)).toBeNull();
  });
});

describe("contentRatingLabel", () => {
  it("retains and trims the provider label", () => expect(contentRatingLabel(" PG-13 ")).toBe("PG-13"));
  it("rejects missing labels", () => expect(contentRatingLabel(" ")).toBeNull());
});

describe("lowestContentRating", () => {
  it("chooses the least restrictive known source", () => {
    expect(
      lowestContentRating([
        { label: "SE-15", age: 15 },
        { label: "12", age: 12 },
      ]),
    ).toEqual({ label: "12", age: 12 });
  });

  it("ignores unrated sources", () => {
    expect(lowestContentRating([{ label: "NR" }, { label: "PG" }])).toEqual({ label: "PG", age: 7 });
  });
});
