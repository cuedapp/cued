import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiMode, AiProvider } from "@/server/integrations/ai/provider";
import { OpenAiClient, OpenAiRequestError } from "@/server/integrations/ai/openai-client";
import type { SecretEncryption } from "@/server/security/encryption";

const defaultModel = "gpt-5.6-luna";

export class AiIntegrationService {
  constructor(private readonly repository: AiRepository, private readonly encryption?: SecretEncryption, private readonly provider: AiProvider = new OpenAiClient()) {}

  async getOverview() {
    const integration = await this.repository.getIntegration();
    const config = integration?.configuration as { mode?: AiMode; model?: string } | undefined;
    return { configured: Boolean(integration), hasApiKey: Boolean(integration?.encryptedApiKey), encryptionConfigured: Boolean(this.encryption), mode: config?.mode ?? "off" as AiMode, model: config?.model ?? defaultModel, status: integration?.status, lastCheckedAt: integration?.lastCheckedAt ?? undefined, lastError: integration?.lastError ?? undefined };
  }

  async configure(input: { apiKey?: string; mode: AiMode; model?: string }) {
    if (!this.encryption && (input.apiKey || input.mode !== "off")) throw new Error("Encryption must be configured before enabling OpenAI");
    const existing = await this.repository.getIntegration();
    const normalizedKey = input.apiKey?.trim();
    const encryptedApiKey = normalizedKey ? this.encryption!.encrypt(normalizedKey) : existing?.encryptedApiKey ?? null;
    const model = input.model?.trim() || defaultModel;
    if (input.mode !== "off" && !encryptedApiKey) throw new Error("OpenAI API key is required");
    if (input.mode !== "off") await this.provider.testConnection(normalizedKey || this.encryption!.decrypt(encryptedApiKey!), model);
    return this.repository.saveIntegration(encryptedApiKey, input.mode, model);
  }

  async testConfiguration(input: { apiKey?: string; model?: string }) {
    const integration = await this.repository.getIntegration();
    const config = integration?.configuration as { model?: string } | undefined;
    const apiKey = input.apiKey?.trim() || (integration?.encryptedApiKey && this.encryption ? this.encryption.decrypt(integration.encryptedApiKey) : undefined);
    if (!apiKey) throw new Error("OpenAI API key is required");
    await this.provider.testConnection(apiKey, input.model?.trim() || config?.model || defaultModel);
  }

  async getConnection() {
    const integration = await this.repository.getIntegration();
    const config = integration?.configuration as { mode?: AiMode; model?: string } | undefined;
    const mode = config?.mode ?? "off";
    if (mode === "off" || !integration?.encryptedApiKey || !this.encryption) return undefined;
    return { id: integration.id, apiKey: this.encryption.decrypt(integration.encryptedApiKey), model: config?.model ?? defaultModel, mode };
  }

  async execute<T>(operation: (provider: AiProvider, apiKey: string, model: string) => Promise<T>) {
    const connection = await this.getConnection();
    if (!connection) throw new Error("AI is disabled");
    try {
      const result = await operation(this.provider, connection.apiKey, connection.model);
      await this.repository.setHealth(connection.id, "healthy");
      return result;
    } catch (error) {
      await this.repository.setHealth(connection.id, "degraded", error instanceof OpenAiRequestError ? error.message : "OpenAI request failed");
      throw error;
    }
  }
}
