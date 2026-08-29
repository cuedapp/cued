import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import { TmdbClient, TmdbRequestError } from "@/server/integrations/tmdb/client";
import type { TmdbProvider } from "@/server/integrations/tmdb/provider";
import type { SecretEncryption } from "@/server/security/encryption";

export interface TmdbIntegrationOverview {
  configured: boolean;
  hasAccessToken: boolean;
  encryptionConfigured: boolean;
  status?: "unconfigured" | "healthy" | "degraded";
  lastCheckedAt?: Date;
  lastError?: string;
}

export class TmdbIntegrationService {
  constructor(
    private readonly repository: TmdbRepository,
    private readonly encryption?: SecretEncryption,
    private readonly provider: TmdbProvider = new TmdbClient(),
  ) {}

  async getOverview(): Promise<TmdbIntegrationOverview> {
    const integration = await this.repository.getIntegration();
    if (!integration) return { configured: false, hasAccessToken: false, encryptionConfigured: Boolean(this.encryption) };
    return {
      configured: true,
      hasAccessToken: Boolean(integration.encryptedApiKey),
      encryptionConfigured: Boolean(this.encryption),
      status: integration.status,
      lastCheckedAt: integration.lastCheckedAt ?? undefined,
      lastError: integration.lastError ?? undefined,
    };
  }

  async configure(accessToken?: string) {
    if (!this.encryption) throw new Error("Encryption must be configured before saving a TMDB access token");
    const existing = await this.repository.getIntegration();
    const normalizedToken = accessToken?.trim();
    const token = normalizedToken || (existing?.encryptedApiKey ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    if (!token) throw new Error("TMDB access token is required");
    await this.provider.getConfiguration(token);
    await this.repository.saveIntegration(normalizedToken ? this.encryption.encrypt(normalizedToken) : existing!.encryptedApiKey!);
    return this.getOverview();
  }

  async testConnection() {
    const { integration, accessToken } = await this.getConnection();
    try {
      const configuration = await this.provider.getConfiguration(accessToken);
      await this.repository.setHealth(integration.id, "healthy");
      return configuration;
    } catch (error) {
      const message = error instanceof TmdbRequestError ? error.message : "TMDB connection failed";
      await this.repository.setHealth(integration.id, "degraded", message);
      throw error;
    }
  }

  async testConfiguration(accessToken?: string) {
    const existing = await this.repository.getIntegration();
    const token = accessToken?.trim() || (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    if (!token) throw new Error("TMDB access token is required");
    return this.provider.getConfiguration(token);
  }

  async getConnection() {
    const integration = await this.repository.getIntegration();
    if (!integration?.encryptedApiKey || !this.encryption) throw new Error("TMDB is not configured");
    return { integration, accessToken: this.encryption.decrypt(integration.encryptedApiKey) };
  }

  async execute<T>(operation: (accessToken: string) => Promise<T>) {
    const { integration, accessToken } = await this.getConnection();
    try {
      const result = await operation(accessToken);
      await this.repository.setHealth(integration.id, "healthy");
      return result;
    } catch (error) {
      const message = error instanceof TmdbRequestError ? error.message : "TMDB request failed";
      await this.repository.setHealth(integration.id, "degraded", message);
      throw error;
    }
  }
}
