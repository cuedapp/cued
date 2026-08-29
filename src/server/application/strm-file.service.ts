import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StrmEntry { relativePath: string; streamUrl: string }

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
}

export function safeMediaName(value: string) {
  const cleaned = value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim();
  return (cleaned || "Untitled").slice(0, 180);
}
