import "server-only";
import path from "node:path";
import type { SecretEncryption } from "@/server/security/encryption";
import type { M3uEditorEpisode, M3uEditorProvider } from "@/server/integrations/m3u-editor/provider";
import type { ManagedStrmEpisode } from "@/server/db/schema";
import type { M3uEditorConfiguration, M3uEditorRepository } from "@/server/db/repositories/m3u-editor.repository";
import { buildM3uEditorStreamUrl } from "@/server/integrations/m3u-editor/stream-url";
import { logger } from "@/lib/logger";
import { safeMediaName, type StrmEntry, type StrmFileService } from "./strm-file.service";

export interface StrmSeriesOverview {
  managed: Array<{
    tmdbId: number;
    title: string;
    writtenCount: number;
    pendingCount: number;
    lastCheckedAt: Date | null;
    lastSyncedAt: Date | null;
    lastError: string | null;
  }>;
  unmanaged: Array<{
    tmdbId: number;
    title: string;
    relativeDirectory: string;
    sources: Array<{ externalId: string; title: string }>;
  }>;
}

export class M3uEditorIntegrationService {
  private refreshPromise: Promise<void> | undefined;
  private seriesWork: Promise<void> = Promise.resolve();

  constructor(
    private repository: M3uEditorRepository,
    private encryption: SecretEncryption | undefined,
    private provider: M3uEditorProvider,
    private strmFiles: StrmFileService,
    private refreshJellyfin: () => Promise<void>,
  ) {}
  async getOverview() {
    const [integration, libraries] = await Promise.all([
      this.repository.getIntegration(),
      this.repository.getLibraries(),
    ]);
    const config = (integration?.configuration ?? {}) as unknown as Partial<M3uEditorConfiguration>;
    const counts = integration ? await this.repository.counts(integration.id) : [];
    return {
      configured: Boolean(integration),
      status: integration?.status ?? ("unconfigured" as const),
      baseUrl: integration?.baseUrl ?? "",
      username: config.username ?? "",
      playbackUsername: config.playbackUsername ?? "admin",
      playlistUuid: config.playlistUuid ?? "",
      playlists: config.playlists ?? [],
      movieDirectory: config.movieDirectory ?? "movies",
      seriesDirectory: config.seriesDirectory ?? "series",
      refreshPlaylist: config.refreshPlaylist ?? false,
      refreshJellyfin: config.refreshJellyfin ?? true,
      strmSeriesUpdateMode: config.strmSeriesUpdateMode ?? "manual",
      syncIntervalMinutes: config.syncIntervalMinutes ?? 0,
      movieLibraryIds:
        config.movieLibraryIds ??
        libraries.filter((library) => /iptv.*movie|movie.*iptv/i.test(library.name)).map((library) => library.id),
      seriesLibraryIds:
        config.seriesLibraryIds ??
        libraries
          .filter((library) => /iptv.*(show|series)|(show|series).*iptv/i.test(library.name))
          .map((library) => library.id),
      hasPassword: Boolean(integration?.encryptedApiKey),
      hasApiToken: Boolean(integration?.encryptedApiToken),
      encryptionConfigured: Boolean(this.encryption),
      lastError: integration?.lastError ?? null,
      lastCheckedAt: integration?.lastCheckedAt ?? null,
      counts: Object.fromEntries(counts.map((row) => [row.type, row.count])) as Record<string, number>,
      libraries,
    };
  }
  async testConfiguration(input: { baseUrl: string; username: string; password?: string; apiToken?: string }) {
    const existing = await this.repository.getIntegration();
    const connection = await this.resolveConnection(input);
    const apiToken = await this.resolveApiToken(input);
    const checksSavedConnection = Boolean(
      existing && existing.baseUrl === connection.baseUrl && !input.password?.trim() && !input.apiToken?.trim(),
    );
    try {
      await this.provider.authenticate(connection);
      const playlists = await this.provider.getPlaylists(connection.baseUrl, apiToken);
      if (checksSavedConnection) await this.repository.setHealth(existing!.id, "healthy");
      return playlists;
    } catch (error) {
      if (checksSavedConnection)
        await this.repository.setHealth(
          existing!.id,
          "degraded",
          error instanceof Error ? error.message : "M3U Editor connection failed",
        );
      throw error;
    }
  }
  async configure(input: {
    baseUrl: string;
    username: string;
    playbackUsername: string;
    password?: string;
    apiToken?: string;
    playlistUuid: string;
    movieLibraryIds: string[];
    seriesLibraryIds: string[];
    movieDirectory: string;
    seriesDirectory: string;
    refreshPlaylist: boolean;
    refreshJellyfin: boolean;
    syncIntervalMinutes?: number;
    strmSeriesUpdateMode?: "manual" | "automatic";
  }) {
    const connection = await this.resolveConnection(input);
    const apiToken = await this.resolveApiToken(input);
    await this.provider.authenticate(connection);
    const playlists = await this.provider.getPlaylists(connection.baseUrl, apiToken);
    if (!playlists.some((playlist) => playlist.uuid === input.playlistUuid))
      throw new Error("Selected playlist is unavailable");
    if (!this.encryption) throw new Error("Encryption is required");
    const existing = await this.repository.getIntegration();
    const encryptedPassword = input.password?.trim()
      ? this.encryption.encrypt(input.password.trim())
      : existing?.encryptedApiKey;
    const encryptedApiToken = input.apiToken?.trim()
      ? this.encryption.encrypt(input.apiToken.trim())
      : existing?.encryptedApiToken;
    if (!encryptedPassword) throw new Error("Password is required");
    if (!encryptedApiToken) throw new Error("API token is required");
    const playbackUsername = input.playbackUsername.trim();
    const saved = await this.repository.save({
      baseUrl: connection.baseUrl,
      encryptedPassword,
      encryptedApiToken,
      configuration: {
        username: connection.username,
        playbackUsername,
        playlistUuid: input.playlistUuid,
        playlists,
        movieLibraryIds: input.movieLibraryIds,
        seriesLibraryIds: input.seriesLibraryIds,
        movieDirectory: input.movieDirectory,
        seriesDirectory: input.seriesDirectory,
        refreshPlaylist: input.refreshPlaylist,
        refreshJellyfin: input.refreshJellyfin,
        syncIntervalMinutes:
          input.syncIntervalMinutes ??
          (existing?.configuration as Partial<M3uEditorConfiguration> | undefined)?.syncIntervalMinutes ??
          0,
        strmSeriesUpdateMode:
          input.strmSeriesUpdateMode ??
          (existing?.configuration as Partial<M3uEditorConfiguration> | undefined)?.strmSeriesUpdateMode ??
          "manual",
      },
    });
    await this.strmFiles.rewritePlaybackUsername({
      directories: [input.movieDirectory, input.seriesDirectory],
      baseUrl: connection.baseUrl,
      playlistUuid: input.playlistUuid,
      playbackUsername,
    });
    return saved;
  }
  async refresh() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.runRefresh().finally(() => {
        this.refreshPromise = undefined;
      });
    }
    return this.refreshPromise;
  }

  private async runRefresh() {
    const run = await this.repository.startAvailabilityRun();
    try {
      const integration = await this.repository.getIntegration();
      if (!integration) throw new Error("M3U Editor is not configured");
      const config = integration.configuration as unknown as M3uEditorConfiguration;
      const connection = await this.resolveConnection({ baseUrl: integration.baseUrl, username: config.username });
      if (config.refreshPlaylist)
        await this.provider.refreshPlaylist(integration.baseUrl, config.playlistUuid, await this.resolveApiToken({}));
      const summary = await this.refreshAvailability(integration.id, connection);
      await this.queueSeriesWork(() => this.checkSeries(integration, config.strmSeriesUpdateMode === "automatic"));
      await this.repository.completeAvailabilityRun(run.id, summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "M3U Editor availability refresh failed";
      await this.repository.failAvailabilityRun(run.id, message);
      throw error;
    }
  }
  async refreshDue(now = new Date()) {
    const overview = await this.getOverview();
    if (!overview.configured || overview.syncIntervalMinutes <= 0) return false;
    if (
      overview.lastCheckedAt &&
      now.getTime() - overview.lastCheckedAt.getTime() < overview.syncIntervalMinutes * 60_000
    )
      return false;
    await this.refresh();
    return true;
  }
  getActiveRun() {
    return this.repository.getActiveAvailabilityRun();
  }
  getRecentRuns() {
    return this.repository.getRecentAvailabilityRuns();
  }
  async setSyncInterval(minutes: number) {
    const integration = await this.repository.getIntegration();
    if (!integration) throw new Error("M3U Editor is not configured");
    await this.repository.setSyncInterval(integration.id, minutes);
  }
  getAvailable(userId: string, titles: Array<{ id: number; type: "movie" | "series" }>) {
    return this.repository.getAvailable(userId, titles);
  }
  getSources(userId: string, type: "movie" | "series", tmdbId: number) {
    return this.repository.getSources(userId, type, tmdbId);
  }
  getAccessibleMappedLibraries(userId: string) {
    return this.repository.getAccessibleMappedLibraries(userId);
  }
  getPendingTitles(titles: Array<{ id: number; type: "movie" | "series" }>) {
    return this.repository.getPendingTitles(titles);
  }
  getStrmJellyfinImports() {
    return this.repository.getStrmJellyfinImports();
  }
  async getStrmSeriesOverview(): Promise<StrmSeriesOverview> {
    const integration = await this.repository.getIntegration();
    if (!integration) return { managed: [], unmanaged: [] };
    const config = integration.configuration as unknown as M3uEditorConfiguration;
    const [managed, sources, existing] = await Promise.all([
      this.repository.listManagedSeries(),
      this.repository.listSeriesSources(),
      this.strmFiles.listExistingSeries(config.seriesDirectory || "series"),
    ]);
    const managedIds = new Set(managed.map((series) => series.tmdbId));
    return {
      managed: managed.map((series) => ({
        tmdbId: series.tmdbId,
        title: series.title,
        writtenCount: series.writtenEpisodes.length,
        pendingCount: pendingEpisodes(series.availableEpisodes, series.writtenEpisodes).length,
        lastCheckedAt: series.lastCheckedAt,
        lastSyncedAt: series.lastSyncedAt,
        lastError: series.lastError,
      })),
      unmanaged: existing
        .filter((series) => !managedIds.has(series.tmdbId))
        .map((series) => ({
          tmdbId: series.tmdbId,
          title: series.title,
          relativeDirectory: series.relativeDirectory,
          sources: sources
            .filter((source) => source.tmdbId === series.tmdbId)
            .map((source) => ({ externalId: source.externalId, title: source.title })),
        })),
    };
  }

  async checkStrmSeriesUpdates(): Promise<void> {
    const integration = await this.repository.getIntegration();
    if (!integration) throw new Error("M3U Editor is not configured");
    await this.queueSeriesWork(() => this.checkSeries(integration, false));
  }

  async syncManagedStrmSeries(
    tmdbId: number,
    externalId?: string,
  ): Promise<{ added: number; updated: number; jellyfinRefresh: "requested" | "disabled" | "failed" }> {
    return this.queueSeriesWork(async () => {
      const integration = await this.repository.getIntegration();
      if (!integration) throw new Error("M3U Editor is not configured");
      const config = integration.configuration as unknown as M3uEditorConfiguration;
      if (!config.playlistUuid || !config.playbackUsername)
        throw new Error("M3U Editor playback playlist is not configured");
      const sources = (await this.repository.listSeriesSources()).filter((source) => source.tmdbId === tmdbId);
      const existing = await this.repository.getManagedSeries(tmdbId);
      const sourceId =
        externalId ?? existing?.externalId ?? (sources.length === 1 ? sources[0]?.externalId : undefined);
      const source = sources.find((item) => item.externalId === sourceId);
      if (!source) throw new Error("Select an available M3U Editor series source");
      if (existing && source.externalId !== existing.externalId)
        throw new Error("This series is already managed from another source");
      const legacy = existing
        ? undefined
        : (await this.strmFiles.listExistingSeries(config.seriesDirectory || "series")).filter(
            (item) => item.tmdbId === tmdbId,
          );
      if (!existing && legacy?.length !== 1) throw new Error("Select a uniquely identified existing STRM series");
      const relativeDirectory = existing?.relativeDirectory ?? legacy![0]!.relativeDirectory;
      const title = existing?.title ?? legacy![0]!.title;
      const previous =
        existing?.writtenEpisodes ??
        legacy![0]!.episodes.map((episode) => ({
          ...episode,
          externalId: "",
          title: "",
          containerExtension: "",
        }));
      const connection = await this.resolveConnection({ baseUrl: integration.baseUrl, username: config.username });
      const episodes = await this.provider.getSeriesEpisodes(connection, source.externalId);
      if (!episodes.length) throw new Error("No IPTV episodes were returned; existing STRM files were not changed");
      const planned = planEpisodes(episodes, relativeDirectory, title, previous);
      const changes = await this.strmFiles.reconcile(this.streamEntries(planned, connection.baseUrl, config));
      const now = new Date();
      await this.repository.saveManagedSeries({
        integrationId: integration.id,
        tmdbId,
        externalId: source.externalId,
        playlistUuid: config.playlistUuid,
        title,
        relativeDirectory,
        requesterId: existing?.requesterId ?? null,
        writtenEpisodes: mergeEpisodes(previous, planned),
        availableEpisodes: planned,
        lastCheckedAt: now,
        lastSyncedAt: now,
        lastError: null,
      });
      let jellyfinRefresh: "requested" | "disabled" | "failed" = "disabled";
      if (changes.added + changes.updated > 0 && (config.refreshJellyfin ?? true)) {
        try {
          await this.refreshJellyfin();
          jellyfinRefresh = "requested";
        } catch {
          jellyfinRefresh = "failed";
          await this.repository.updateManagedSeries((await this.repository.getManagedSeries(tmdbId))!.id, {
            lastError: "STRM files were written, but Jellyfin library refresh failed",
          });
        }
      }
      return { ...changes, jellyfinRefresh };
    });
  }
  async createStrmRequest(
    userId: string,
    type: "movie" | "series",
    tmdbId: number,
    sourceId: string,
    canonicalTitle: string,
  ) {
    const target = await this.repository.getRequestTarget(userId, type, tmdbId, sourceId);
    if (!target) throw new Error("IPTV title is unavailable or access is not allowed");
    const connection = await this.resolveConnection({
      baseUrl: target.integration.baseUrl,
      username: target.config.username,
    });
    const { playlistUuid, playbackUsername } = target.config;
    if (!playlistUuid || !playbackUsername) throw new Error("M3U Editor playback playlist is not configured");
    const officialTitle = safeMediaName(canonicalTitle);
    const folder = safeMediaName(`${officialTitle} [tmdbid-${tmdbId}]`);
    let files: number;
    if (type === "movie") {
      const file = `${folder}.strm`;
      const streamUrl = buildM3uEditorStreamUrl(
        connection.baseUrl,
        "movie",
        playbackUsername,
        playlistUuid,
        target.title.externalId,
        target.title.containerExtension ?? "mkv",
      );
      files = await this.strmFiles.write([
        { relativePath: `${target.config.movieDirectory || "movies"}/${folder}/${file}`, streamUrl },
      ]);
    } else {
      files = await this.queueSeriesWork(async () => {
        const existing = await this.repository.getManagedSeries(tmdbId);
        if (existing && (existing.externalId !== target.title.externalId || existing.playlistUuid !== playlistUuid))
          throw new Error("This STRM series is already managed from another source or playlist");
        const relativeDirectory =
          existing?.relativeDirectory ?? path.posix.join(target.config.seriesDirectory || "series", folder);
        const episodes = await this.provider.getSeriesEpisodes(connection, target.title.externalId);
        if (!episodes.length) throw new Error("No IPTV episodes were returned for this series");
        const planned = planEpisodes(episodes, relativeDirectory, officialTitle, existing?.writtenEpisodes ?? []);
        await this.strmFiles.reconcile(this.streamEntries(planned, connection.baseUrl, target.config));
        await this.repository.saveManagedSeries({
          integrationId: target.integration.id,
          tmdbId,
          externalId: target.title.externalId,
          playlistUuid,
          title: officialTitle,
          relativeDirectory,
          requesterId: existing?.requesterId ?? userId,
          writtenEpisodes: mergeEpisodes(existing?.writtenEpisodes ?? [], planned),
          availableEpisodes: planned,
          lastCheckedAt: new Date(),
          lastSyncedAt: new Date(),
          lastError: null,
        });
        return planned.length;
      });
    }
    await this.repository.enqueueJellyfinImport(userId, type, tmdbId);
    let jellyfinRefresh: "requested" | "disabled" | "failed" = "disabled";
    if (target.config.refreshJellyfin ?? true) {
      try {
        await this.refreshJellyfin();
        jellyfinRefresh = "requested";
      } catch {
        jellyfinRefresh = "failed";
      }
    }
    return { files, jellyfinRefresh };
  }
  private async checkSeries(
    integration: { id: string; baseUrl: string; configuration: Record<string, unknown> },
    automatic: boolean,
  ) {
    const series = await this.repository.listManagedSeries();
    if (!series.length) return;
    const config = integration.configuration as unknown as M3uEditorConfiguration;
    const sources = new Set(
      (await this.repository.listSeriesSources()).map((item) => `${item.tmdbId}:${item.externalId}`),
    );
    const connection = await this.resolveConnection({ baseUrl: integration.baseUrl, username: config.username });
    const changedIds: string[] = [];
    for (const item of series) {
      try {
        if (item.playlistUuid !== config.playlistUuid)
          throw new Error("Playback playlist changed; manually resync this series before enabling automatic updates");
        if (!sources.has(`${item.tmdbId}:${item.externalId}`))
          throw new Error("The selected series source is no longer in the M3U Editor catalogue");
        const episodes = await this.provider.getSeriesEpisodes(connection, item.externalId);
        if (!episodes.length) throw new Error("No IPTV episodes were returned; existing STRM files were preserved");
        const planned = planEpisodes(episodes, item.relativeDirectory, item.title, item.writtenEpisodes);
        const now = new Date();
        await this.repository.updateManagedSeries(item.id, {
          availableEpisodes: planned,
          lastCheckedAt: now,
          lastError: null,
        });
        if (!automatic) continue;
        const pending = pendingEpisodes(planned, item.writtenEpisodes);
        if (!pending.length) continue;
        const writes = await this.strmFiles.reconcile(this.streamEntries(pending, connection.baseUrl, config));
        await this.repository.updateManagedSeries(item.id, {
          writtenEpisodes: mergeEpisodes(item.writtenEpisodes, planned),
          lastSyncedAt: now,
          lastError: null,
        });
        if (writes.added + writes.updated > 0) changedIds.push(item.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Series episode check failed";
        await this.repository.updateManagedSeries(item.id, {
          lastCheckedAt: new Date(),
          lastError: message.slice(0, 300),
        });
        logger.warn("Managed STRM series episode check failed", {
          tmdbId: item.tmdbId,
          errorType: error instanceof Error ? error.name : typeof error,
        });
      }
    }
    if (changedIds.length && (config.refreshJellyfin ?? true)) {
      try {
        await this.refreshJellyfin();
      } catch {
        logger.warn("Jellyfin scan failed after automatic STRM series updates");
        for (const id of changedIds)
          await this.repository.updateManagedSeries(id, {
            lastError: "STRM files were written, but Jellyfin library refresh failed",
          });
      }
    }
  }

  private streamEntries(episodes: ManagedStrmEpisode[], baseUrl: string, config: M3uEditorConfiguration): StrmEntry[] {
    return episodes.map((episode) => ({
      relativePath: episode.relativePath,
      streamUrl: buildM3uEditorStreamUrl(
        baseUrl,
        "series",
        config.playbackUsername,
        config.playlistUuid,
        episode.externalId,
        episode.containerExtension,
      ),
    }));
  }

  private queueSeriesWork<T>(task: () => Promise<T>): Promise<T> {
    const running = this.seriesWork.then(task, task);
    this.seriesWork = running.then(
      () => undefined,
      () => undefined,
    );
    return running;
  }
  private async refreshAvailability(
    integrationId: string,
    connection: { baseUrl: string; username: string; password: string },
  ) {
    try {
      const titles = await this.provider.getTitles(connection);
      const summary = await this.repository.replaceAvailability(integrationId, titles);
      await this.repository.setHealth(integrationId, "healthy");
      return summary;
    } catch (error) {
      try {
        await this.repository.setHealth(
          integrationId,
          "degraded",
          (error instanceof Error ? error.message : "M3U Editor refresh failed").slice(0, 1_000),
        );
      } catch {
        /* Health persistence must not mask the catalogue import failure. */
      }
      throw error;
    }
  }
  private async resolveConnection(input: { baseUrl: string; username: string; password?: string }) {
    const existing = await this.repository.getIntegration();
    const password =
      input.password?.trim() ||
      (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    if (!password) throw new Error("Password is required");
    return { baseUrl: input.baseUrl.replace(/\/+$/, ""), username: input.username.trim(), password };
  }
  private async resolveApiToken(input: { apiToken?: string }) {
    const existing = await this.repository.getIntegration();
    const apiToken =
      input.apiToken?.trim() ||
      (existing?.encryptedApiToken && this.encryption
        ? this.encryption.decrypt(existing.encryptedApiToken)
        : undefined);
    if (!apiToken) throw new Error("API token is required");
    return apiToken;
  }
}

function episodeKey(episode: Pick<ManagedStrmEpisode, "seasonNumber" | "episodeNumber">) {
  return `${episode.seasonNumber}:${episode.episodeNumber}`;
}

export function planEpisodes(
  episodes: M3uEditorEpisode[],
  relativeDirectory: string,
  title: string,
  previous: ManagedStrmEpisode[],
): ManagedStrmEpisode[] {
  const paths = new Map(previous.map((episode) => [episodeKey(episode), episode.relativePath]));
  const seen = new Set<string>();
  return episodes.map((episode) => {
    if (
      !Number.isSafeInteger(episode.seasonNumber) ||
      episode.seasonNumber < 0 ||
      !Number.isSafeInteger(episode.episodeNumber) ||
      episode.episodeNumber < 0 ||
      !episode.externalId ||
      !/^[a-z0-9]{1,8}$/i.test(episode.containerExtension)
    )
      throw new Error("M3U Editor returned an invalid episode");
    const key = episodeKey(episode);
    if (seen.has(key)) throw new Error("M3U Editor returned duplicate episode numbers");
    seen.add(key);
    const previousPath = paths.get(key);
    if (previousPath && !previousPath.startsWith(`${relativeDirectory}/`))
      throw new Error("Existing STRM episode path is outside its series directory");
    const season = String(episode.seasonNumber).padStart(2, "0");
    const number = String(episode.episodeNumber).padStart(2, "0");
    return {
      ...episode,
      relativePath:
        previousPath ??
        path.posix.join(
          relativeDirectory,
          `Season ${season}`,
          `${safeMediaName(`${title} - S${season}E${number} - ${episode.title}`)}.strm`,
        ),
    };
  });
}

export function pendingEpisodes(available: ManagedStrmEpisode[], written: ManagedStrmEpisode[]): ManagedStrmEpisode[] {
  const prior = new Map(written.map((episode) => [episodeKey(episode), episode]));
  return available.filter((episode) => {
    const existing = prior.get(episodeKey(episode));
    return (
      !existing ||
      existing.externalId !== episode.externalId ||
      existing.containerExtension !== episode.containerExtension ||
      existing.relativePath !== episode.relativePath
    );
  });
}

function mergeEpisodes(previous: ManagedStrmEpisode[], available: ManagedStrmEpisode[]): ManagedStrmEpisode[] {
  const merged = new Map(previous.map((episode) => [episodeKey(episode), episode]));
  for (const episode of available) merged.set(episodeKey(episode), episode);
  return [...merged.values()];
}
