import "server-only";
import type { NotificationProvider } from "@/server/integrations/notifications/provider";
import type { SecretEncryption } from "@/server/security/encryption";
import { NotificationRepository } from "@/server/db/repositories/notification.repository";
import type { ReleaseService } from "./release.service";

export class NotificationService {
  constructor(
    private repository: NotificationRepository,
    private encryption: SecretEncryption | undefined,
    private provider: NotificationProvider,
    private releases?: ReleaseService,
  ) {}

  async getInAppPreferences(userId: string) {
    return this.repository.getInAppPreferences(userId);
  }
  async saveInAppPreferences(
    userId: string,
    values: {
      recommendationUpdates: boolean;
      requestUpdates: boolean;
      requestAvailabilityUpdates: boolean;
      followingUpdates: boolean;
    },
  ) {
    return this.repository.saveInAppPreferences(userId, values);
  }

  async getNtfyOverview() {
    const integration = await this.repository.getNtfyIntegration();
    const configuration = integration?.configuration as
      | {
          topic?: string;
          integrationFailures?: boolean;
          jobFailures?: boolean;
          failureThreshold?: number;
          updates?: boolean;
        }
      | undefined;
    return {
      configured: Boolean(integration),
      baseUrl: integration?.baseUrl ?? "https://ntfy.sh",
      topic: configuration?.topic ?? "",
      hasToken: Boolean(integration?.encryptedApiKey),
      encryptionConfigured: Boolean(this.encryption),
      failureThreshold: configuration?.failureThreshold ?? 3,
      integrationFailures: configuration?.integrationFailures ?? true,
      jobFailures: configuration?.jobFailures ?? true,
      updates: configuration?.updates ?? true,
      status: integration?.status,
      lastCheckedAt: integration?.lastCheckedAt ?? undefined,
      lastError: integration?.lastError ?? undefined,
    };
  }
  async configureNtfy(values: {
    baseUrl: string;
    token?: string;
    topic: string;
    integrationFailures: boolean;
    jobFailures: boolean;
    failureThreshold: number;
    updates: boolean;
  }) {
    const existing = await this.repository.getNtfyIntegration();
    let encryptedToken = existing?.encryptedApiKey;
    if (values.token) {
      if (!this.encryption) throw new Error("Encryption is required");
      encryptedToken = this.encryption.encrypt(values.token);
    }
    if (values.token && !this.encryption) throw new Error("Encryption is required");
    await this.provider.send(
      {
        baseUrl: values.baseUrl,
        token:
          values.token || (encryptedToken && this.encryption ? this.encryption.decrypt(encryptedToken) : undefined),
      },
      { topic: values.topic, title: "Cued test notification", message: "ntfy integration is working." },
    );
    return this.repository.saveNtfyIntegration({
      baseUrl: values.baseUrl,
      encryptedToken,
      topic: values.topic,
      integrationFailures: values.integrationFailures,
      jobFailures: values.jobFailures,
      failureThreshold: values.failureThreshold,
      updates: values.updates,
    });
  }
  async testNtfy(input: { baseUrl: string; token?: string; topic: string }) {
    const existing = await this.repository.getNtfyIntegration();
    const token =
      input.token ||
      (existing?.encryptedApiKey && this.encryption ? this.encryption.decrypt(existing.encryptedApiKey) : undefined);
    await this.provider.send(
      { baseUrl: input.baseUrl, token },
      {
        topic: input.topic,
        title: "Cued test notification",
        message: "The ntfy integration is working.",
        tags: ["white_check_mark"],
      },
    );
  }
  async dispatch() {
    const integration = await this.repository.getNtfyIntegration();
    const config = integration?.configuration as
      | {
          topic?: string;
          integrationFailures?: boolean;
          jobFailures?: boolean;
          failureThreshold?: number;
          updates?: boolean;
        }
      | undefined;
    if (!integration || !config?.topic) return;
    const [admin] = await this.repository.listAdminIds();
    if (!admin) return;
    for (const failed of config.integrationFailures
      ? await this.repository.listPersistentFailures(config.failureThreshold ?? 3)
      : [])
      await this.repository.enqueue({
        userId: admin.id,
        provider: "ntfy",
        eventKey: `integration:${failed.id}:${failed.failureStartedAt?.toISOString()}`,
        eventType: "persistent_failure",
        title: `${failed.serverName ?? failed.provider} needs attention`,
        message: failed.lastError ?? "The integration has failed repeatedly.",
        clickUrl: "/settings/integrations",
      });
    for (const failed of config.jobFailures ? await this.repository.listRecentJobFailures() : [])
      await this.repository.enqueue({
        userId: admin.id,
        provider: "ntfy",
        eventKey: `job:${failed.id}`,
        eventType: "job_failed",
        title: "Background job failed",
        message: failed.error ?? failed.jobName,
        clickUrl: "/activity",
      });
    if (config.updates && this.releases) {
      const release = await this.releases.getStatus();
      if (release.updateAvailable && release.latestVersion)
        await this.repository.enqueue({
          userId: admin.id,
          provider: "ntfy",
          eventKey: `update:${release.latestVersion}`,
          eventType: "update_available",
          title: "A Cued update is available",
          message: `${release.latestVersion} is available; you are running ${release.currentVersion}.`,
          clickUrl: "/settings",
        });
    }
    for (const delivery of await this.repository.claimPending(25, "ntfy")) {
      try {
        const token = integration.encryptedApiKey ? this.encryption?.decrypt(integration.encryptedApiKey) : undefined;
        if (integration.encryptedApiKey && !token) throw new Error("Secret encryption is unavailable");
        await this.provider.send(
          { baseUrl: integration.baseUrl, token },
          {
            topic: config.topic,
            title: delivery.title,
            message: delivery.message,
            clickUrl: delivery.clickUrl ?? undefined,
          },
        );
        await this.repository.sent(delivery.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Notification failed";
        await this.repository.failed(delivery.id, delivery.attempts, message);
      }
    }
  }
}
