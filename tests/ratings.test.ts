import { describe, expect, it } from "vitest";
import { formatPercentage, formatScoreOutOfTen } from "@/lib/ratings";

describe("rating presentation", () => {
  it("normalizes provider and recommendation scales to one decimal out of ten", () => {
    expect(formatScoreOutOfTen(91)).toBe("9.1");
    expect(formatScoreOutOfTen(73, 100)).toBe("7.3");
    expect(formatScoreOutOfTen(6.7, 10)).toBe("6.7");
  });

  it("presents recommendation matches as rounded percentages", () => {
    expect(formatPercentage(91)).toBe("91%");
    expect(formatPercentage(8.75, 10)).toBe("88%");
  });
});
