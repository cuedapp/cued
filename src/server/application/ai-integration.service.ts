import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiMode, AiProvider, AiProviderId } from "@/server/integrations/ai/provider";
import { OpenAiClient, OpenAiRequestError } from "@/server/integrations/ai/openai-client";
import { OpenRouterClient, OpenRouterRequestError } from "@/server/integrations/ai/openrouter-client";
import type { SecretEncryption } from "@/server/security/encryption";

const defaultModel = "gpt-5.6-luna";
const defaultRefreshDelayMinutes = 5;

export class AiIntegrationService {
  private readonly providers: Record<AiProviderId, AiProvider>;

  constructor(private readonly repository: AiRepository, private readonly encryption?: SecretEncryption, providers: AiProvider | Record<AiProviderId, AiProvider> = new OpenAiClient()) {
    this.providers = "openai" in providers ? providers : { openai: providers, openrouter: new OpenRouterClient() };
  }

  async getOverview(provider: AiProviderId = "openai") {
    const integration = await this.repository.getIntegration(provider);
    const config = integration?.configuration as { mode?: AiMode; model?: string; refreshDelayMinutes?: number; usage?: { model: string; requests: number; inputTokens: number; outputTokens: number; costUsd: number; updatedAt: string } } | undefined;
    return { configured: Boolean(integration), hasApiKey: Boolean(integration?.encryptedApiKey), encryptionConfigured: Boolean(this.encryption), mode: config?.mode ?? "off" as AiMode, model: config?.model ?? defaultModel, refreshDelayMinutes: config?.refreshDelayMinutes ?? defaultRefreshDelayMinutes, usage: config?.usage, status: integration?.status, lastCheckedAt: integration?.lastCheckedAt ?? undefined, lastError: integration?.lastError ?? undefined };
  }

  async configure(input: { provider?: AiProviderId; apiKey?: string; mode: AiMode; model?: string; refreshDelayMinutes?: number }) {
    const providerId = input.provider ?? "openai";
    if (!this.encryption && (input.apiKey || input.mode !== "off")) throw new Error("Encryption must be configured before enabling AI");
    const existing = await this.repository.getIntegration(providerId);
    const normalizedKey = input.apiKey?.trim();
    const encryptedApiKey = normalizedKey ? this.encryption!.encrypt(normalizedKey) : existing?.encryptedApiKey ?? null;
    const model = input.model?.trim() || defaultModel;
    if (input.mode !== "off" && !encryptedApiKey) throw new Error("AI API key is required");
    if (input.mode !== "off") await this.providers[providerId].testConnection(normalizedKey || this.encryption!.decrypt(encryptedApiKey!), model);
    return this.repository.saveIntegration(providerId, encryptedApiKey, input.mode, model, input.refreshDelayMinutes ?? defaultRefreshDelayMinutes);
  }

  async testConfiguration(input: { provider?: AiProviderId; apiKey?: string; model?: string }) {
    const providerId = input.provider ?? "openai";
    const integration = await this.repository.getIntegration(providerId);
    const config = integration?.configuration as { model?: string } | undefined;
    const apiKey = input.apiKey?.trim() || (integration?.encryptedApiKey && this.encryption ? this.encryption.decrypt(integration.encryptedApiKey) : undefined);
    if (!apiKey) throw new Error("AI API key is required");
    await this.providers[providerId].testConnection(apiKey, input.model?.trim() || config?.model || defaultModel);
  }

  async getConnection() {
    const integration = await this.repository.getEnabledIntegration();
    const config = integration?.configuration as { mode?: AiMode; model?: string } | undefined;
    const mode = config?.mode ?? "off";
    if (mode === "off" || !integration?.encryptedApiKey || !this.encryption) return undefined;
    const providerId = integration.provider as AiProviderId;
    if (!(providerId in this.providers)) return undefined;
    return { id: integration.id, providerId, apiKey: this.encryption.decrypt(integration.encryptedApiKey), model: config?.model ?? defaultModel, mode };
  }

  async getRefreshDelayMinutes() {
    const integration = await this.repository.getEnabledIntegration();
    if (!integration) return 0;
    const configured = (integration.configuration as { refreshDelayMinutes?: number }).refreshDelayMinutes;
    return configured === 0 || configured === 5 || configured === 15 || configured === 30 ? configured : defaultRefreshDelayMinutes;
  }

  async execute<T>(operation: (provider: AiProvider, apiKey: string, model: string) => Promise<T>) {
    const connection = await this.getConnection();
    if (!connection) throw new Error("AI is disabled");
    try {
      const result = await operation(this.providers[connection.providerId], connection.apiKey, connection.model);
      await this.repository.setHealth(connection.id, "healthy");
      return result;
    } catch (error) {
      await this.repository.setHealth(connection.id, "degraded", error instanceof OpenAiRequestError || error instanceof OpenRouterRequestError ? error.message : "AI request failed");
      throw error;
    }
  }
}
