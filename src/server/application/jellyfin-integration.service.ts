import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import { JellyfinClient, normalizeJellyfinUrl } from "@/server/integrations/jellyfin/client";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import type { SecretEncryption } from "@/server/security/encryption";

export interface JellyfinIntegrationOverview {
  configured: boolean;
  hasApiKey: boolean;
  encryptionConfigured: boolean;
  baseUrl?: string;
  serverName?: string;
  serverVersion?: string;
  status?: "unconfigured" | "healthy" | "degraded";
  lastCheckedAt?: Date;
  lastError?: string;
  libraries: Array<{ id: string; name: string; collectionType?: string; selected: boolean }>;
  syncIntervalMinutes: number;
}

export class JellyfinIntegrationService {
  constructor(
    private readonly repository: JellyfinRepository,
    private readonly encryption?: SecretEncryption,
    private readonly clientFactory: (baseUrl: string) => MediaServerProvider = (baseUrl) => new JellyfinClient(baseUrl),
  ) {}

  async getOverview(): Promise<JellyfinIntegrationOverview> {
    const integration = await this.repository.getIntegration();
    if (!integration) return { configured: false, hasApiKey: false, encryptionConfigured: Boolean(this.encryption), libraries: [], syncIntervalMinutes: 0 };
    const libraries = await this.repository.getLibraries(integration.id);
    return {
      configured: true,
      hasApiKey: Boolean(integration.encryptedApiKey),
      encryptionConfigured: Boolean(this.encryption),
      baseUrl: integration.baseUrl,
      serverName: integration.serverName ?? undefined,
      serverVersion: integration.serverVersion ?? undefined,
      status: integration.status,
      lastCheckedAt: integration.lastCheckedAt ?? undefined,
      lastError: integration.lastError ?? undefined,
      syncIntervalMinutes: typeof integration.configuration?.syncIntervalMinutes === "number" ? integration.configuration.syncIntervalMinutes : 0,
      libraries: libraries.map((library) => ({
        id: library.jellyfinLibraryId,
        name: library.name,
        ...(library.collectionType ? { collectionType: library.collectionType } : {}),
        selected: library.selected,
      })),
    };
  }

  async configure(input: { baseUrl: string; apiKey?: string }) {
    const baseUrl = normalizeJellyfinUrl(input.baseUrl);
    const existing = await this.repository.getIntegration();
    const apiKey = input.apiKey?.trim() || (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    if (input.apiKey && !this.encryption) throw new Error("Encryption must be configured before saving an API key");
    const client = this.clientFactory(baseUrl);
    const info = await client.testConnection(apiKey);
    const integration = await this.repository.saveIntegration({
      baseUrl,
      encryptedApiKey: input.apiKey ? this.encryption!.encrypt(input.apiKey.trim()) : undefined,
      serverId: info.id,
      serverName: info.name,
      serverVersion: info.version,
    });
    if (apiKey) await this.repository.syncLibraries(integration.id, await client.getLibraries(apiKey));
    return this.getOverview();
  }

  async testConnection() {
    const integration = await this.repository.getIntegration();
    if (!integration) throw new Error("Jellyfin is not configured");
    const apiKey = integration.encryptedApiKey && this.encryption ? this.encryption.decrypt(integration.encryptedApiKey) : undefined;
    try {
      const info = await this.clientFactory(integration.baseUrl).testConnection(apiKey);
      await this.repository.setHealth(integration.id, "healthy");
      return info;
    } catch (error) {
      await this.repository.setHealth(integration.id, "degraded", error instanceof Error ? error.message : "Connection failed");
      throw error;
    }
  }

  async testConfiguration(input: { baseUrl: string; apiKey?: string }) {
    const baseUrl = normalizeJellyfinUrl(input.baseUrl);
    const existing = await this.repository.getIntegration();
    const apiKey = input.apiKey?.trim() || (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    return this.clientFactory(baseUrl).testConnection(apiKey);
  }

  async selectLibraries(selectedIds: string[]) {
    const integration = await this.repository.getIntegration();
    if (!integration) throw new Error("Jellyfin is not configured");
    await this.repository.setSelectedLibraries(integration.id, selectedIds);
  }

  async setSyncInterval(minutes: number) { const integration = await this.repository.getIntegration(); if (!integration) throw new Error("Jellyfin is not configured"); await this.repository.setSyncInterval(integration.id, minutes); }

  async getUserAvatar(userId: string, tag?: string) {
    const integration = await this.repository.getIntegration();
    if (!integration?.encryptedApiKey || !this.encryption) return undefined;
    const apiKey = this.encryption.decrypt(integration.encryptedApiKey);
    return this.clientFactory(integration.baseUrl).getUserAvatar(apiKey, userId, tag);
  }

  async getItemImage(itemId: string) {
    const integration = await this.repository.getIntegration();
    if (!integration?.encryptedApiKey || !this.encryption) return undefined;
    return this.clientFactory(integration.baseUrl).getItemImage(this.encryption.decrypt(integration.encryptedApiKey), itemId);
  }

  async refreshLibrary() {
    const integration = await this.repository.getIntegration();
    if (!integration?.encryptedApiKey || !this.encryption) throw new Error("Jellyfin API key is not configured");
    await this.clientFactory(integration.baseUrl).refreshLibrary(this.encryption.decrypt(integration.encryptedApiKey));
  }
}
