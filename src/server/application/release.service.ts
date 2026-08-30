import { appVersion } from "./app-version";
import type { OperationalRepository } from "@/server/db/repositories/operational.repository";

const releaseUrl = "https://api.github.com/repos/cuedapp/cued/releases/latest";
const cacheTtlMs = 6 * 60 * 60 * 1_000;
export type ReleaseStatus = { currentVersion: string; latestVersion: string | null; updateAvailable: boolean; releaseUrl: string | null; notes: string | null; publishedAt: string | null; checkedAt: Date | null };
type GithubRelease = { tag_name: string; html_url: string; body: string | null; published_at: string | null; prerelease: boolean };

function normalize(version: string) { return version.replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10) || 0); }
export function isNewerVersion(candidate: string, current: string) { const next = normalize(candidate); const installed = normalize(current); for (let index = 0; index < Math.max(next.length, installed.length); index += 1) { if ((next[index] ?? 0) !== (installed[index] ?? 0)) return (next[index] ?? 0) > (installed[index] ?? 0); } return false; }

export class ReleaseService {
  constructor(private readonly repository: OperationalRepository, private readonly request: typeof fetch = fetch) {}
  async getStatus(force = false): Promise<ReleaseStatus> {
    let cached = force ? undefined : await this.repository.getCachedRelease();
    if (!cached) try {
      const response = await this.request(releaseUrl, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Cued" }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const release = await response.json() as GithubRelease;
      if (release.prerelease) throw new Error("GitHub returned a prerelease");
      await this.repository.saveCachedRelease({ tagName: release.tag_name, url: release.html_url, notes: release.body, publishedAt: release.published_at }, cacheTtlMs);
      cached = await this.repository.getCachedRelease();
    } catch { /* An update check must never make Settings unavailable. */ }
    const payload = cached?.payload as { tagName?: string; url?: string; notes?: string | null; publishedAt?: string | null } | undefined;
    const latestVersion = payload?.tagName ?? null;
    return { currentVersion: appVersion, latestVersion, updateAvailable: latestVersion ? isNewerVersion(latestVersion, appVersion) : false, releaseUrl: payload?.url ?? null, notes: payload?.notes ?? null, publishedAt: payload?.publishedAt ?? null, checkedAt: cached?.updatedAt ?? null };
  }
}
