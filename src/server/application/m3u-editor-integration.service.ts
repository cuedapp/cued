import "server-only";
import type { SecretEncryption } from "@/server/security/encryption";
import type { M3uEditorProvider } from "@/server/integrations/m3u-editor/provider";
import type { M3uEditorConfiguration, M3uEditorRepository } from "@/server/db/repositories/m3u-editor.repository";
import { buildM3uEditorStreamUrl } from "@/server/integrations/m3u-editor/stream-url";
import { safeMediaName, type StrmFileService } from "./strm-file.service";

export class M3uEditorIntegrationService {
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
    const connection = await this.resolveConnection(input);
    const apiToken = await this.resolveApiToken(input);
    await this.provider.authenticate(connection);
    return this.provider.getPlaylists(connection.baseUrl, apiToken);
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
      },
    });
    await this.strmFiles.rewritePlaybackUsername({
      directories: [input.movieDirectory, input.seriesDirectory],
      baseUrl: connection.baseUrl,
      playlistUuid: input.playlistUuid,
      playbackUsername,
    });
    await this.refreshAvailability(saved.id, connection);
    return saved;
  }
  async refresh() {
    const integration = await this.repository.getIntegration();
    if (!integration) throw new Error("M3U Editor is not configured");
    const config = integration.configuration as unknown as M3uEditorConfiguration;
    const connection = await this.resolveConnection({ baseUrl: integration.baseUrl, username: config.username });
    if (config.refreshPlaylist)
      await this.provider.refreshPlaylist(integration.baseUrl, config.playlistUuid, await this.resolveApiToken({}));
    await this.refreshAvailability(integration.id, connection);
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
      const episodes = await this.provider.getSeriesEpisodes(connection, target.title.externalId);
      if (!episodes.length) throw new Error("No IPTV episodes were returned for this series");
      files = await this.strmFiles.write(
        episodes.map((episode) => {
          const season = String(episode.seasonNumber).padStart(2, "0");
          const number = String(episode.episodeNumber).padStart(2, "0");
          const name = safeMediaName(`${officialTitle} - S${season}E${number} - ${episode.title}`);
          return {
            relativePath: `${target.config.seriesDirectory || "series"}/${folder}/Season ${season}/${name}.strm`,
            streamUrl: buildM3uEditorStreamUrl(
              connection.baseUrl,
              "series",
              playbackUsername,
              playlistUuid,
              episode.externalId,
              episode.containerExtension,
            ),
          };
        }),
      );
    }
    await this.repository.enqueueJellyfinImport(type, tmdbId);
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
  private async refreshAvailability(
    integrationId: string,
    connection: { baseUrl: string; username: string; password: string },
  ) {
    try {
      const titles = await this.provider.getTitles(connection);
      await this.repository.replaceAvailability(integrationId, titles);
      await this.repository.setHealth(integrationId, "healthy");
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
