import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ManagedStrmSeries } from "@/server/db/schema";
import type { M3uEditorEpisode } from "@/server/integrations/m3u-editor/provider";
import { M3uEditorIntegrationService, pendingEpisodes, planEpisodes } from "./m3u-editor-integration.service";
import { StrmFileService } from "./strm-file.service";

vi.mock("server-only", () => ({}));

const playlistUuid = "a1630f5e-2700-402e-ab1e-50e24f84bab3";
const episode = (seasonNumber: number, episodeNumber: number, externalId: string): M3uEditorEpisode => ({
  seasonNumber,
  episodeNumber,
  externalId,
  title: `Episode ${episodeNumber}`,
  containerExtension: "mkv",
});

async function fixture(mode: "manual" | "automatic", initial?: ManagedStrmSeries) {
  const root = await mkdtemp(path.join(tmpdir(), "cued-series-"));
  const files = new StrmFileService(root);
  let managed = initial;
  const episodesBySource: Record<string, M3uEditorEpisode[]> = { "501": [episode(1, 1, "101")] };
  const requestTargets: Record<string, { externalId: string; containerExtension: string | null }> = {};
  const integration = {
    id: "integration-1",
    baseUrl: "https://tv.example",
    encryptedApiKey: "encrypted",
    configuration: {
      username: "user",
      playbackUsername: "playback",
      playlistUuid,
      seriesDirectory: "series",
      refreshJellyfin: true,
      refreshPlaylist: false,
      strmSeriesUpdateMode: mode,
    },
  };
  const repository = {
    getRequestTarget: vi.fn(async (_userId: string, _type: "movie" | "series", _tmdbId: number, sourceId: string) => {
      const title = requestTargets[sourceId];
      return title ? { integration, config: integration.configuration, title } : undefined;
    }),
    getIntegration: vi.fn(async () => integration),
    listManagedSeries: vi.fn(async () => (managed ? [managed] : [])),
    getManagedSeries: vi.fn(async () => managed),
    listSeriesSources: vi.fn(async () => [{ tmdbId: 42, externalId: "501", title: "The Show", groupName: "Group A" }]),
    updateManagedSeries: vi.fn(async (_id: string, patch: Partial<ManagedStrmSeries>) => {
      managed = { ...managed!, ...patch };
      return managed;
    }),
    saveManagedSeries: vi.fn(async (input: Partial<ManagedStrmSeries>) => {
      managed = { ...managed, ...input, id: managed?.id ?? "series-1" } as ManagedStrmSeries;
      return managed;
    }),
    enqueueJellyfinImport: vi.fn(async () => undefined),
    startAvailabilityRun: vi.fn(async () => ({ id: 1 })),
    replaceAvailability: vi.fn(async () => ({ addedMovies: 0, removedMovies: 0, addedSeries: 0, removedSeries: 0 })),
    setHealth: vi.fn(async () => undefined),
    completeAvailabilityRun: vi.fn(async () => undefined),
    failAvailabilityRun: vi.fn(async () => undefined),
  };
  const provider = {
    getTitles: vi.fn(async () => []),
    getSeriesEpisodes: vi.fn(async (_connection: unknown, sourceId: string) => episodesBySource[sourceId] ?? []),
  };
  const refreshJellyfin = vi.fn(async () => undefined);
  const service = new M3uEditorIntegrationService(
    repository as never,
    { decrypt: () => "password" } as never,
    provider as never,
    files,
    refreshJellyfin,
  );
  return {
    root,
    files,
    service,
    integration,
    repository,
    provider,
    refreshJellyfin,
    get managed() {
      return managed;
    },
    setEpisodes(next: M3uEditorEpisode[]) {
      episodesBySource["501"] = next;
    },
    setSourceEpisodes(sourceId: string, next: M3uEditorEpisode[]) {
      episodesBySource[sourceId] = next;
    },
    setRequestTarget(sourceId: string, externalId: string) {
      requestTargets[sourceId] = { externalId, containerExtension: "mkv" };
    },
  };
}

describe("M3U Editor STRM series updates", () => {
  it("checks without writing, then adds new seasons and updates changed episode links automatically", async () => {
    const directory = "series/The Show [tmdbid-42]";
    const original = planEpisodes([episode(1, 1, "101")], directory, "The Show", []);
    const test = await fixture("manual", {
      id: "series-1",
      integrationId: "integration-1",
      tmdbId: 42,
      externalId: "501",
      secondaryExternalId: null,
      playlistUuid,
      title: "The Show",
      relativeDirectory: directory,
      requesterId: null,
      writtenEpisodes: original,
      availableEpisodes: original,
      lastCheckedAt: null,
      lastSyncedAt: null,
      lastError: null,
      updatedAt: new Date(),
    });
    const first = path.join(test.root, original[0]!.relativePath);
    await test.files.write([
      {
        relativePath: original[0]!.relativePath,
        streamUrl: `https://tv.example/series/playback/${playlistUuid}/101.mkv`,
      },
    ]);
    test.setEpisodes([episode(1, 1, "101"), episode(2, 1, "201")]);

    await test.service.checkStrmSeriesUpdates();
    expect((await test.service.getStrmSeriesOverview()).managed[0]?.pendingCount).toBe(1);
    expect(await readdir(path.join(test.root, directory))).toEqual(["Season 01"]);
    expect(test.refreshJellyfin).not.toHaveBeenCalled();

    const manual = await test.service.syncManagedStrmSeries(42);
    expect(manual).toEqual({ added: 1, updated: 0, jellyfinRefresh: "requested" });
    const second = test.managed!.writtenEpisodes.find((item) => item.seasonNumber === 2)!.relativePath;
    expect(await readFile(first, "utf8")).toContain("/101.mkv\n");
    expect(await readFile(path.join(test.root, second), "utf8")).toContain("/201.mkv\n");

    test.integration.configuration.strmSeriesUpdateMode = "automatic";
    test.setEpisodes([episode(1, 1, "101"), episode(2, 1, "202")]);
    await test.service.refresh();
    expect(await readFile(path.join(test.root, second), "utf8")).toContain("/202.mkv\n");
    expect(test.refreshJellyfin).toHaveBeenCalledTimes(2);

    test.setEpisodes([episode(2, 1, "202")]);
    await test.service.refresh();
    expect(await readFile(first, "utf8")).toContain("/101.mkv\n");
    expect(test.managed!.writtenEpisodes).toHaveLength(2);
    expect(test.refreshJellyfin).toHaveBeenCalledTimes(2);
  });
  it("merges a secondary source, prefers primary duplicates, and keeps the merge during automatic checks", async () => {
    const test = await fixture("manual", {
      id: "series-1",
      integrationId: "integration-1",
      tmdbId: 42,
      externalId: "501",
      secondaryExternalId: null,
      playlistUuid,
      title: "The Show",
      relativeDirectory: "series/The Show [tmdbid-42]",
      requesterId: null,
      writtenEpisodes: [],
      availableEpisodes: [],
      lastCheckedAt: null,
      lastSyncedAt: null,
      lastError: null,
      updatedAt: new Date(),
    });
    const primary = { tmdbId: 42, externalId: "501", title: "The Show", groupName: "Primary" };
    const secondary = { tmdbId: 42, externalId: "502", title: "The Show", groupName: "Secondary" };
    test.repository.listSeriesSources.mockResolvedValueOnce([primary, secondary]);
    test.setSourceEpisodes("501", [episode(1, 1, "primary-101"), episode(1, 3, "primary-103")]);
    test.setSourceEpisodes("502", [episode(1, 1, "secondary-201"), episode(1, 2, "secondary-202")]);
    expect(await test.service.compareStrmSeriesSources(42, "501", "502")).toEqual({
      primary: 2,
      secondary: 2,
      shared: 1,
      primaryOnly: 1,
      secondaryOnly: 1,
      combined: 3,
    });
    expect(test.managed!.secondaryExternalId).toBeNull();
    await expect(readdir(path.join(test.root, "series"))).rejects.toThrow();
    test.repository.listSeriesSources.mockResolvedValueOnce([primary, secondary]);

    await test.service.syncManagedStrmSeries(42, "501", "502");
    expect(test.managed!.secondaryExternalId).toBe("502");
    const written = test.managed!.writtenEpisodes;
    expect(written.map(({ seasonNumber, episodeNumber }) => `${seasonNumber}:${episodeNumber}`)).toEqual([
      "1:1",
      "1:3",
      "1:2",
    ]);
    const streamAt = async (episodeNumber: number) => {
      const item = test.managed!.writtenEpisodes.find((row) => row.episodeNumber === episodeNumber)!;
      return readFile(path.join(test.root, item.relativePath), "utf8");
    };
    expect(await streamAt(1)).toContain("/primary-101.mkv\n");
    expect(await streamAt(2)).toContain("/secondary-202.mkv\n");

    test.integration.configuration.strmSeriesUpdateMode = "automatic";
    test.repository.listSeriesSources.mockResolvedValueOnce([primary, secondary]);
    test.setSourceEpisodes("501", [episode(1, 3, "primary-103"), episode(1, 4, "primary-104")]);
    test.setSourceEpisodes("502", [episode(1, 1, "secondary-201"), episode(1, 2, "secondary-202")]);
    await test.service.refresh();

    expect(test.managed!.writtenEpisodes).toHaveLength(4);
    expect(await streamAt(1)).toContain("/secondary-201.mkv\n");
    expect(await streamAt(4)).toContain("/primary-104.mkv\n");
  });
  it("creates series STRM requests from selected sources and rejects duplicate selections", async () => {
    const test = await fixture("manual");
    const primarySourceId = "59e9c3b5-e2e6-4af6-a5dc-9db674cd2a1c";
    const secondarySourceId = "95b4c2af-894a-4cda-90bb-793335a2ac8a";
    test.setRequestTarget(primarySourceId, "501");
    test.setRequestTarget(secondarySourceId, "502");
    test.setSourceEpisodes("501", [episode(1, 1, "primary-101"), episode(1, 3, "primary-103")]);
    test.setSourceEpisodes("502", [episode(1, 1, "secondary-201"), episode(1, 2, "secondary-202")]);

    await expect(
      test.service.createStrmRequest("user-1", "series", 42, primarySourceId, "The Show", primarySourceId),
    ).rejects.toThrow("different secondary source");
    await expect(readdir(path.join(test.root, "series"))).rejects.toThrow();

    expect(
      await test.service.createStrmRequest("user-1", "series", 42, primarySourceId, "The Show", secondarySourceId),
    ).toEqual({ files: 3, jellyfinRefresh: "requested" });
    expect(test.managed!.externalId).toBe("501");
    expect(test.managed!.secondaryExternalId).toBe("502");
    const streamAt = async (episodeNumber: number) => {
      const item = test.managed!.writtenEpisodes.find((row) => row.episodeNumber === episodeNumber)!;
      return readFile(path.join(test.root, item.relativePath), "utf8");
    };
    expect(await streamAt(1)).toContain("/primary-101.mkv\n");
    expect(await streamAt(2)).toContain("/secondary-202.mkv\n");
    expect(test.repository.enqueueJellyfinImport).toHaveBeenCalledTimes(1);
  });

  it("adopts a legacy folder, preserves episode paths, and refuses ambiguous or empty sources", async () => {
    const test = await fixture("manual");
    const oldPath = "series/Old Show [tmdbid-42]/Season 01/Old Show - S01E01 - Pilot.strm";
    await test.files.write([{ relativePath: oldPath, streamUrl: "https://tv.example/series/old/old/100.mkv" }]);
    test.setEpisodes([episode(1, 1, "101"), episode(2, 1, "201")]);
    test.repository.listSeriesSources.mockResolvedValueOnce([
      { tmdbId: 42, externalId: "501", title: "Source A", groupName: "Group A" },
      { tmdbId: 42, externalId: "502", title: "Source B", groupName: "Group B" },
    ]);
    await expect(test.service.syncManagedStrmSeries(42)).rejects.toThrow("Select an available");
    await expect(test.service.syncManagedStrmSeries(42, "stale")).rejects.toThrow("Select an available");

    expect(await test.service.syncManagedStrmSeries(42, "501")).toEqual({
      added: 1,
      updated: 1,
      jellyfinRefresh: "requested",
    });
    expect(test.managed!.writtenEpisodes.find((item) => item.seasonNumber === 1)?.relativePath).toBe(oldPath);
    expect(await readFile(path.join(test.root, oldPath), "utf8")).toContain("/101.mkv\n");
    expect(await readdir(path.join(test.root, "series"))).toEqual(["Old Show [tmdbid-42]"]);
  });

  it("does not erase files or the written manifest on an empty upstream response", async () => {
    const test = await fixture("automatic");
    const directory = "series/The Show [tmdbid-42]";
    const original = planEpisodes([episode(1, 1, "101")], directory, "The Show", []);
    await test.files.write([{ relativePath: original[0]!.relativePath, streamUrl: "https://tv.example/old" }]);
    await test.repository.saveManagedSeries({
      integrationId: "integration-1",
      tmdbId: 42,
      externalId: "501",
      secondaryExternalId: null,
      playlistUuid,
      title: "The Show",
      relativeDirectory: directory,
      requesterId: null,
      writtenEpisodes: original,
      availableEpisodes: original,
      lastCheckedAt: null,
      lastSyncedAt: null,
      lastError: null,
    });
    test.setEpisodes([]);
    await test.service.refresh();
    expect(test.managed!.writtenEpisodes).toEqual(original);
    expect(await readFile(path.join(test.root, original[0]!.relativePath), "utf8")).toBe("https://tv.example/old\n");
    expect(test.managed!.lastError).toMatch(/No IPTV episodes/);
    expect(test.refreshJellyfin).not.toHaveBeenCalled();
  });

  it("requires an explicit resync before switching existing series to another playback playlist", async () => {
    const test = await fixture("automatic");
    const directory = "series/The Show [tmdbid-42]";
    const original = planEpisodes([episode(1, 1, "101")], directory, "The Show", []);
    await test.repository.saveManagedSeries({
      integrationId: "integration-1",
      tmdbId: 42,
      externalId: "501",
      secondaryExternalId: null,
      playlistUuid,
      title: "The Show",
      relativeDirectory: directory,
      requesterId: null,
      writtenEpisodes: original,
      availableEpisodes: original,
      lastCheckedAt: null,
      lastSyncedAt: null,
      lastError: null,
    });
    await test.files.write([
      {
        relativePath: original[0]!.relativePath,
        streamUrl: `https://tv.example/series/playback/${playlistUuid}/101.mkv`,
      },
    ]);
    const nextPlaylist = "130c66eb-bbf3-48cf-bc0e-644925faee3c";
    test.integration.configuration.playlistUuid = nextPlaylist;
    test.setEpisodes([episode(1, 1, "101"), episode(2, 1, "201")]);

    await test.service.refresh();
    expect(test.managed!.lastError).toMatch(/Playback playlist changed/);
    expect(await readdir(path.join(test.root, directory))).toEqual(["Season 01"]);
    expect(test.refreshJellyfin).not.toHaveBeenCalled();

    expect(await test.service.syncManagedStrmSeries(42)).toEqual({
      added: 1,
      updated: 1,
      jellyfinRefresh: "requested",
    });
    expect(test.managed!.playlistUuid).toBe(nextPlaylist);
    expect(await readFile(path.join(test.root, original[0]!.relativePath), "utf8")).toContain(
      `/${nextPlaylist}/101.mkv\n`,
    );
  });

  it("detects stream identifier changes while keeping established filenames", () => {
    const directory = "series/The Show [tmdbid-42]";
    const original = planEpisodes([episode(1, 1, "101")], directory, "The Show", []);
    const renamed = planEpisodes([{ ...episode(1, 1, "102"), title: "Renamed" }], directory, "The Show", original);
    expect(renamed[0]?.relativePath).toBe(original[0]?.relativePath);
    expect(pendingEpisodes(renamed, original)).toEqual(renamed);
  });
});
