import "server-only";
import { formatScoreOutOfTen } from "@/lib/ratings";
import type { NotificationProvider } from "@/server/integrations/notifications/provider";
import type { SecretEncryption } from "@/server/security/encryption";
import { NotificationRepository, defaultNotificationPreferences } from "@/server/db/repositories/notification.repository";
import type { ReleaseService } from "./release.service";

export class NotificationService {
  constructor(private repository: NotificationRepository, private encryption: SecretEncryption | undefined, private provider: NotificationProvider, private releases?: ReleaseService) {}

  async getPreferences(userId: string) { const row = await this.repository.getPreferences(userId); return { ...row, encryptedToken: undefined, hasToken: Boolean(row.encryptedToken), encryptionConfigured: Boolean(this.encryption) }; }
  async savePreferences(userId: string, values: typeof defaultNotificationPreferences & { token?: string }) {
    const existing = await this.repository.getPreferences(userId); let encryptedToken = existing.encryptedToken;
    if (values.token) { if (!this.encryption) throw new Error("Encryption is required"); encryptedToken = this.encryption.encrypt(values.token); }
    return this.repository.savePreferences(userId, { ...values, encryptedToken });
  }
  async testConfiguration(userId: string, input: { baseUrl: string; token?: string; topic: string }) {
    const existing = await this.repository.getPreferences(userId); const token = input.token || (existing.encryptedToken && this.encryption ? this.encryption.decrypt(existing.encryptedToken) : undefined);
    await this.provider.send({ baseUrl: input.baseUrl, token }, { topic: input.topic, title: "Cued test notification", message: "Your personal ntfy connection is working.", tags: ["white_check_mark"] });
  }
  async dispatch() {
    const recipients = await this.repository.listPreferences();
    for (const { preference, user } of recipients) {
      if (preference.strongRecommendations) for (const item of await this.repository.listStrongRecommendations(user.id, preference.minimumMatch)) await this.repository.enqueue({ userId: user.id, provider: "ntfy", eventKey: `recommendation:${item.id}`, eventType: "strong_recommendation", title: "A strong match for you", message: `${item.title} is a ${formatScoreOutOfTen(item.matchPercent)}/10 match.`, clickUrl: "/recommendations" });
      for (const { event, follow } of await this.repository.listFollowEvents(user.id)) {
        if (event.eventType === "requestable" && preference.followedRequestable) await this.repository.enqueue({ userId: user.id, provider: "ntfy", eventKey: `follow:${event.id}`, eventType: event.eventType, title: "Now requestable", message: `${event.relatedTitle ?? follow.title} can now be requested.`, clickUrl: "/following" });
        if (event.eventType === "new_season" && preference.newSeasons) await this.repository.enqueue({ userId: user.id, provider: "ntfy", eventKey: `follow:${event.id}`, eventType: event.eventType, title: "New season detected", message: `${follow.title} has a new season.`, clickUrl: "/following" });
      }
      if (user.role === "admin" && preference.persistentFailures) for (const failed of await this.repository.listPersistentFailures(preference.failureThreshold)) await this.repository.enqueue({ userId: user.id, provider: "ntfy", eventKey: `integration:${failed.id}:${failed.failureStartedAt?.toISOString()}`, eventType: "persistent_failure", title: `${failed.serverName ?? failed.provider} needs attention`, message: failed.lastError ?? "The integration has failed repeatedly.", clickUrl: "/settings/integrations" });
      if (user.role === "admin" && preference.updates && this.releases) { const release = await this.releases.getStatus(); if (release.updateAvailable && release.latestVersion) await this.repository.enqueue({ userId: user.id, provider: "ntfy", eventKey: `update:${release.latestVersion}`, eventType: "update_available", title: "A Cued update is available", message: `${release.latestVersion} is available; you are running ${release.currentVersion}.`, clickUrl: "/settings" }); }
    }
    for (const delivery of await this.repository.claimPending()) {
      const preference = await this.repository.getPreferences(delivery.userId);
      if (!preference.topic) continue;
      try { const token = preference.encryptedToken ? this.encryption?.decrypt(preference.encryptedToken) : undefined; if (preference.encryptedToken && !token) throw new Error("Secret encryption is unavailable"); await this.provider.send({ baseUrl: preference.baseUrl, token }, { topic: preference.topic, title: delivery.title, message: delivery.message, clickUrl: delivery.clickUrl ?? undefined }); await this.repository.sent(delivery.id); }
      catch (error) { const message = error instanceof Error ? error.message : "Notification failed"; await this.repository.failed(delivery.id, delivery.attempts, message); }
    }
  }
}
