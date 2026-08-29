import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { safeMediaName, StrmFileService } from "./strm-file.service";

describe("StrmFileService", () => {
  it("writes one URL with a trailing newline", async () => { const root = await mkdtemp(path.join(tmpdir(), "cued-strm-")); const service = new StrmFileService(root); await expect(service.write([{ relativePath: "movies/Test/Test.strm", streamUrl: "https://iptv.test/movie/u/p/1.mkv" }])).resolves.toBe(1); await expect(readFile(path.join(root, "movies/Test/Test.strm"), "utf8")).resolves.toBe("https://iptv.test/movie/u/p/1.mkv\n"); });
  it("rejects paths outside the configured volume", async () => { const root = await mkdtemp(path.join(tmpdir(), "cued-strm-")); await expect(new StrmFileService(root).write([{ relativePath: "../secret.strm", streamUrl: "https://example.test" }])).rejects.toThrow("Invalid STRM output path"); });
  it("sanitizes names that are unsafe on common filesystems", () => { expect(safeMediaName('Movie: The / Return?')).toBe("Movie The Return"); });
});
