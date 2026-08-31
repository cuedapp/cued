import { describe, expect, it } from "vitest";
import { formatScoreOutOfTen } from "@/lib/ratings";

describe("rating presentation", () => {
  it("normalizes provider and recommendation scales to one decimal out of ten", () => {
    expect(formatScoreOutOfTen(91)).toBe("9.1");
    expect(formatScoreOutOfTen(73, 100)).toBe("7.3");
    expect(formatScoreOutOfTen(6.7, 10)).toBe("6.7");
  });
});
