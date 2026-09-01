import type { ArrRepository } from "@/server/db/repositories/arr.repository";
import type { ArrProvider } from "@/server/integrations/arr/provider";
import type { SecretEncryption } from "@/server/security/encryption";

interface ArrConfiguration {
  rootFolderPath?: string;
  qualityProfileId?: number;
  tagIds?: number[];
  searchOnAdd?: boolean;
  seriesMonitor?: string;
}

export class ArrIntegrationService {
  constructor(
    private readonly repository: ArrRepository,
    private readonly encryption: SecretEncryption | undefined,
    private readonly provider: ArrProvider,
  ) {}

  async getOverview() {
    const integration = await this.repository.getIntegration();
    const configuration = integration?.configuration as ArrConfiguration | undefined;
    return {
      configured: Boolean(integration?.encryptedApiKey),
      encryptionConfigured: Boolean(this.encryption),
      baseUrl: integration?.baseUrl ?? "",
      hasApiKey: Boolean(integration?.encryptedApiKey),
      serverName: integration?.serverName ?? undefined,
      serverVersion: integration?.serverVersion ?? undefined,
      status: integration?.status,
      lastError: integration?.lastError ?? undefined,
      rootFolderPath: configuration?.rootFolderPath,
      qualityProfileId: configuration?.qualityProfileId,
      tagIds: configuration?.tagIds ?? [],
      searchOnAdd: configuration?.searchOnAdd ?? true,
      seriesMonitor: configuration?.seriesMonitor ?? "all",
    };
  }

  async testConfiguration(input: { baseUrl: string; apiKey?: string }) {
    const connection = await this.resolveConnection(input);
    const [status, rootFolders, qualityProfiles, tags] = await Promise.all([
      this.provider.getStatus(connection),
      this.provider.getRootFolders(connection),
      this.provider.getQualityProfiles(connection),
      this.provider.getTags(connection),
    ]);
    return { status, rootFolders, qualityProfiles, tags };
  }

  async configure(input: {
    baseUrl: string;
    apiKey?: string;
    rootFolderPath?: string;
    qualityProfileId?: number;
    tagIds?: number[];
    searchOnAdd?: boolean;
    seriesMonitor?: string;
  }) {
    if (!this.encryption) throw new Error("Encryption must be configured before saving an Arr API key");
    const existing = await this.repository.getIntegration();
    const connection = await this.resolveConnection(input);
    const [status, rootFolders, qualityProfiles, tags] = await Promise.all([
      this.provider.getStatus(connection),
      this.provider.getRootFolders(connection),
      this.provider.getQualityProfiles(connection),
      this.provider.getTags(connection),
    ]);
    const rootFolderPath = input.rootFolderPath || rootFolders[0]?.path;
    const qualityProfileId = input.qualityProfileId || qualityProfiles[0]?.id;
    if (!rootFolderPath || !qualityProfileId) throw new Error("A root folder and quality profile are required");
    if (
      !rootFolders.some((folder) => folder.path === rootFolderPath) ||
      !qualityProfiles.some((profile) => profile.id === qualityProfileId)
    )
      throw new Error("Selected Arr defaults are no longer available");
    const tagIds = (input.tagIds ?? []).filter((id) => tags.some((tag) => tag.id === id));
    return this.repository.save({
      baseUrl: connection.baseUrl,
      encryptedApiKey: input.apiKey?.trim() ? this.encryption.encrypt(input.apiKey.trim()) : existing!.encryptedApiKey!,
      serverName: status.instanceName,
      serverVersion: status.version,
      configuration: {
        rootFolderPath,
        qualityProfileId,
        tagIds,
        searchOnAdd: input.searchOnAdd ?? true,
        seriesMonitor: input.seriesMonitor ?? "all",
      },
    });
  }

  async getOptions() {
    const connection = await this.getConnection();
    if (!connection) return { rootFolders: [], qualityProfiles: [], tags: [] };
    return Promise.all([
      this.provider.getRootFolders(connection),
      this.provider.getQualityProfiles(connection),
      this.provider.getTags(connection),
    ]).then(([rootFolders, qualityProfiles, tags]) => ({ rootFolders, qualityProfiles, tags }));
  }

  async getRequestState(tmdbId: number) {
    const connection = await this.getConnection();
    if (!connection) return "unavailable" as const;
    const title = await this.provider.lookup(connection, tmdbId);
    return title?.id ? ("existing" as const) : ("requestable" as const);
  }

  async getExistingTmdbIds() {
    const connection = await this.getConnection();
    return connection ? this.provider.getExistingTmdbIds(connection) : [];
  }

  async lookupMetadata(tmdbId: number) {
    const connection = await this.getConnection();
    return connection ? this.provider.lookup(connection, tmdbId) : undefined;
  }

  async request(tmdbId: number, overrides: { rootFolderPath?: string; qualityProfileId?: number } = {}) {
    const connection = await this.getConnection();
    if (!connection) throw new Error(`${this.provider.kind} is not configured`);
    const integration = await this.repository.getIntegration();
    const config = integration!.configuration as ArrConfiguration;
    try {
      const rootFolderPath = overrides.rootFolderPath ?? config.rootFolderPath;
      const qualityProfileId = overrides.qualityProfileId ?? config.qualityProfileId;
      if (!rootFolderPath || !qualityProfileId) throw new Error("A root folder and quality profile are required");
      if (overrides.rootFolderPath !== undefined || overrides.qualityProfileId !== undefined) {
        const [folders, profiles] = await Promise.all([
          this.provider.getRootFolders(connection),
          this.provider.getQualityProfiles(connection),
        ]);
        if (!folders.some((folder) => folder.path === rootFolderPath))
          throw new Error("Selected root folder is not available");
        if (!profiles.some((profile) => profile.id === qualityProfileId))
          throw new Error("Selected quality profile is not available");
      }
      const title = await this.provider.lookup(connection, tmdbId);
      if (!title) throw new Error("Title was not found by the provider");
      if (title.id) return { state: "existing" as const, title, rootFolderPath, qualityProfileId };
      const added = await this.provider.add(connection, title, {
        rootFolderPath,
        qualityProfileId,
        tagIds: config.tagIds,
        searchOnAdd: config.searchOnAdd,
        seriesMonitor: config.seriesMonitor,
      });
      await this.repository.setHealth(integration!.id, "healthy");
      return { state: "requested" as const, title: added, rootFolderPath, qualityProfileId };
    } catch (error) {
      await this.repository.setHealth(
        integration!.id,
        "degraded",
        error instanceof Error ? error.message : "Request failed",
      );
      throw error;
    }
  }

  private async resolveConnection(input: { baseUrl: string; apiKey?: string }) {
    const existing = await this.repository.getIntegration();
    const apiKey =
      input.apiKey?.trim() ||
      (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    if (!apiKey) throw new Error("API key is required");
    return { baseUrl: input.baseUrl.replace(/\/+$/, ""), apiKey };
  }

  private async getConnection() {
    const integration = await this.repository.getIntegration();
    if (!integration?.encryptedApiKey || !this.encryption) return undefined;
    return { baseUrl: integration.baseUrl, apiKey: this.encryption.decrypt(integration.encryptedApiKey) };
  }
}
