import { describe, expect, it, vi } from "vitest";
import { AiIntegrationService } from "@/server/application/ai-integration.service";
import type { AiRepository } from "@/server/db/repositories/ai.repository";
import type { AiProvider } from "@/server/integrations/ai/provider";
import { SecretEncryption } from "@/server/security/encryption";

describe("AiIntegrationService", () => {
  it("tests entered credentials without persisting configuration or health", async () => {
    const repository = { getIntegration: vi.fn().mockResolvedValue(undefined), saveIntegration: vi.fn(), setHealth: vi.fn() } as unknown as AiRepository;
    const provider = { testConnection: vi.fn().mockResolvedValue(undefined) } as unknown as AiProvider;

    await new AiIntegrationService(repository, undefined, provider).testConfiguration({ apiKey: "new-key", model: "gpt-5.6-luna" });

    expect(provider.testConnection).toHaveBeenCalledWith("new-key", "gpt-5.6-luna");
    expect(repository.saveIntegration).not.toHaveBeenCalled();
    expect(repository.setHealth).not.toHaveBeenCalled();
  });

  it("can test a newly selected model with the already stored key", async () => {
    const encryption = new SecretEncryption(Buffer.alloc(32, 9).toString("base64"));
    const repository = { getIntegration: vi.fn().mockResolvedValue({ encryptedApiKey: encryption.encrypt("stored-key"), configuration: { model: "gpt-4o-mini" } }), saveIntegration: vi.fn(), setHealth: vi.fn() } as unknown as AiRepository;
    const provider = { testConnection: vi.fn().mockResolvedValue(undefined) } as unknown as AiProvider;

    await new AiIntegrationService(repository, encryption, provider).testConfiguration({ model: "gpt-5-nano" });

    expect(provider.testConnection).toHaveBeenCalledWith("stored-key", "gpt-5-nano");
    expect(repository.saveIntegration).not.toHaveBeenCalled();
    expect(repository.setHealth).not.toHaveBeenCalled();
  });
});
