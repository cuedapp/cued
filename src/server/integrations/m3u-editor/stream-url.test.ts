import { describe, expect, it } from "vitest";
import { buildM3uEditorStreamUrl } from "./stream-url";

describe("buildM3uEditorStreamUrl", () => {
  it("uses the selected playlist UUID instead of the Xtream password", () => {
    expect(
      buildM3uEditorStreamUrl(
        "https://m3u-url.com/",
        "movie",
        "admin",
        "a1630f5e-2700-402e-ab1e-50e24f84bab3",
        "762027",
        "mkv",
      ),
    ).toBe("https://m3u-url.com/movie/admin/a1630f5e-2700-402e-ab1e-50e24f84bab3/762027.mkv");
  });
});
