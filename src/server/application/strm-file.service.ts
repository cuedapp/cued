import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

export interface StrmEntry {
  relativePath: string;
  streamUrl: string;
}

export interface ExistingStrmSeries {
  tmdbId: number;
  title: string;
  relativeDirectory: string;
  episodes: Array<{ seasonNumber: number; episodeNumber: number; relativePath: string }>;
}

export class StrmFileService {
  constructor(private readonly root: string) {}

  async write(entries: StrmEntry[]) {
    const root = path.resolve(this.root);
    for (const entry of entries) {
      const target = path.resolve(root, entry.relativePath);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid STRM output path");
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.tmp`;
      await writeFile(temporary, `${entry.streamUrl}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, target);
    }
    return entries.length;
  }

  async reconcile(entries: StrmEntry[]) {
    const root = path.resolve(this.root);
    let added = 0;
    let updated = 0;
    for (const entry of entries) {
      const target = path.resolve(root, entry.relativePath);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid STRM output path");
      const next = `${entry.streamUrl}\n`;
      let previous: string | undefined;
      try {
        previous = await readFile(target, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (previous === next) continue;
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.tmp`;
      await writeFile(temporary, next, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, target);
      if (previous === undefined) added++;
      else updated++;
    }
    return { added, updated };
  }

  async listExistingSeries(directory: string): Promise<ExistingStrmSeries[]> {
    const root = path.resolve(this.root);
    const seriesRoot = path.resolve(root, directory);
    if (!seriesRoot.startsWith(`${root}${path.sep}`)) throw new Error("Invalid STRM output path");
    const folders = await readEntries(seriesRoot);
    const result: ExistingStrmSeries[] = [];
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      const match = /^(.*) \[tmdbid-(\d+)\]$/.exec(folder.name);
      if (!match) continue;
      const tmdbId = Number(match[2]);
      if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) continue;
      const relativeDirectory = path.posix.join(directory, folder.name);
      const episodes: ExistingStrmSeries["episodes"] = [];
      for (const season of await readEntries(path.join(seriesRoot, folder.name))) {
        if (!season.isDirectory()) continue;
        const seasonNumber = /^Season (\d+)$/.exec(season.name);
        if (!seasonNumber) continue;
        for (const file of await readEntries(path.join(seriesRoot, folder.name, season.name))) {
          if (!file.isFile() || path.extname(file.name).toLowerCase() !== ".strm") continue;
          const numbers = /S(\d+)E(\d+)/i.exec(file.name);
          if (!numbers || Number(numbers[1]) !== Number(seasonNumber[1])) continue;
          episodes.push({
            seasonNumber: Number(numbers[1]),
            episodeNumber: Number(numbers[2]),
            relativePath: path.posix.join(relativeDirectory, season.name, file.name),
          });
        }
      }
      if (episodes.length) result.push({ tmdbId, title: match[1]!, relativeDirectory, episodes });
    }
    return result;
  }

  async rewritePlaybackUsername(input: {
    directories: string[];
    baseUrl: string;
    playlistUuid: string;
    playbackUsername: string;
  }) {
    const root = path.resolve(this.root);
    const base = new URL(input.baseUrl);
    let rewritten = 0;
    for (const directory of input.directories) {
      const target = path.resolve(root, directory);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid STRM output path");
      rewritten += await rewriteDirectory(target, base, input.playlistUuid, input.playbackUsername);
    }
    return rewritten;
  }
}

async function readEntries(directory: string): Promise<Dirent[]> {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function rewriteDirectory(
  directory: string,
  base: URL,
  playlistUuid: string,
  playbackUsername: string,
): Promise<number> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
  let rewritten = 0;
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      rewritten += await rewriteDirectory(target, base, playlistUuid, playbackUsername);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".strm") continue;
    const current = (await readFile(target, "utf8")).trim();
    const next = rewritePlaybackUrl(current, base, playlistUuid, playbackUsername);
    if (!next || next === current) continue;
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${next}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
    rewritten++;
  }
  return rewritten;
}

// M3U Editor may be hosted below a path prefix (e.g. https://host/m3u), so the base path must be stripped before reading the type/username/playlist segments.
function rewritePlaybackUrl(value: string, base: URL, playlistUuid: string, playbackUsername: string) {
  try {
    const url = new URL(value);
    const basePath = base.pathname.replace(/\/+$/, "");
    if (url.origin !== base.origin || !url.pathname.startsWith(`${basePath}/`)) return undefined;
    const segments = url.pathname.slice(basePath.length).split("/");
    if (!["movie", "series"].includes(segments[1] ?? "") || segments[3] !== playlistUuid) return undefined;
    segments[2] = encodeURIComponent(playbackUsername);
    url.pathname = `${basePath}${segments.join("/")}`;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function safeMediaName(value: string) {
  const cleaned = value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return (cleaned || "Untitled").slice(0, 180);
}
