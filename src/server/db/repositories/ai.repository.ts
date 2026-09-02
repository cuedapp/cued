import "server-only";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations, metadataCacheEntries, userTasteProfiles } from "@/server/db/schema";
import type { AiMode, AiProviderId, TasteProfile } from "@/server/integrations/ai/provider";

export class AiRepository {
  async getIntegration(provider: AiProviderId = "openai") {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, provider) });
  }

  async getEnabledIntegration() {
    const rows = await db.query.integrations.findMany({
      where: sql`${integrations.provider} in ('openai', 'openrouter')`,
      orderBy: (integration, { desc }) => [desc(integration.updatedAt)],
    });
    return rows.find((row) => ((row.configuration as { mode?: AiMode }).mode ?? "off") !== "off");
  }

  async saveIntegration(
    provider: AiProviderId,
    encryptedApiKey: string | null,
    mode: AiMode,
    model: string,
    refreshDelayMinutes = 5,
  ) {
    const now = new Date();
    const existing = await this.getIntegration(provider);
    const usage = (existing?.configuration as { usage?: Record<string, unknown> } | undefined)?.usage;
    const configuration = { mode, model, refreshDelayMinutes, ...(usage ? { usage } : {}) };
    const details =
      provider === "openrouter"
        ? { baseUrl: "https://openrouter.ai/api/v1", serverName: "OpenRouter" }
        : { baseUrl: "https://api.openai.com/v1", serverName: "OpenAI" };
    const [saved] = await db
      .insert(integrations)
      .values({
        provider,
        ...details,
        encryptedApiKey,
        configuration,
        status: mode === "off" ? "unconfigured" : "healthy",
        lastCheckedAt: mode === "off" ? null : now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: integrations.provider,
        set: {
          ...details,
          encryptedApiKey,
          configuration,
          status: mode === "off" ? "unconfigured" : "healthy",
          lastError: null,
          updatedAt: now,
        },
      })
      .returning();
    if (!saved) throw new Error("AI integration could not be saved");
    if (mode !== "off")
      await db
        .update(integrations)
        .set({
          configuration: sql`${integrations.configuration} || '{"mode":"off"}'::jsonb`,
          status: "unconfigured",
          updatedAt: now,
        })
        .where(and(sql`${integrations.provider} in ('openai', 'openrouter')`, ne(integrations.provider, provider)));
    return saved;
  }

  async recordUsage(
    provider: AiProviderId,
    usage: { model: string; inputTokens: number; outputTokens: number; costUsd?: number },
  ) {
    const cost = usage.costUsd ?? 0;
    await db
      .update(integrations)
      .set({
        configuration: sql`jsonb_set(${integrations.configuration}, '{usage}', jsonb_build_object(
        'model', ${usage.model}::text,
        'requests', coalesce((${integrations.configuration}->'usage'->>'requests')::integer, 0) + 1,
        'inputTokens', coalesce((${integrations.configuration}->'usage'->>'inputTokens')::bigint, 0) + ${usage.inputTokens}::bigint,
        'outputTokens', coalesce((${integrations.configuration}->'usage'->>'outputTokens')::bigint, 0) + ${usage.outputTokens}::bigint,
        'costUsd', coalesce((${integrations.configuration}->'usage'->>'costUsd')::numeric, 0) + ${cost}::numeric,
        'updatedAt', ${new Date().toISOString()}::text
      ), true)`,
        updatedAt: new Date(),
      })
      .where(eq(integrations.provider, provider));
  }

  async setHealth(id: string, status: "healthy" | "degraded", error?: string) {
    const now = new Date();
    await db
      .update(integrations)
      .set(
        status === "healthy"
          ? {
              status,
              lastCheckedAt: now,
              lastError: null,
              consecutiveFailures: 0,
              failureStartedAt: null,
              updatedAt: now,
            }
          : {
              status,
              lastCheckedAt: now,
              lastError: error ?? null,
              consecutiveFailures: sql`${integrations.consecutiveFailures} + 1`,
              failureStartedAt: sql`coalesce(${integrations.failureStartedAt}, ${now})`,
              updatedAt: now,
            },
      )
      .where(eq(integrations.id, id));
  }

  async getProfile(userId: string) {
    return db.query.userTasteProfiles.findFirst({ where: eq(userTasteProfiles.userId, userId) });
  }

  async saveProfile(
    userId: string,
    fingerprint: string,
    provider: string,
    model: string,
    profile: TasteProfile,
    sourceMediaCount: number,
  ) {
    const now = new Date();
    const storedProfile = profile as unknown as Record<string, unknown>;
    await db
      .insert(userTasteProfiles)
      .values({
        userId,
        onboardingStatus: "completed",
        profile: storedProfile,
        signalFingerprint: fingerprint,
        provider,
        model,
        sourceMediaCount,
        completedAt: now,
        generatedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userTasteProfiles.userId,
        set: {
          profile: storedProfile,
          signalFingerprint: fingerprint,
          provider,
          model,
          sourceMediaCount,
          onboardingStatus: "completed",
          completedAt: now,
          generatedAt: now,
          updatedAt: now,
        },
      });
  }

  async getCached<T>(provider: AiProviderId, key: string): Promise<T | undefined> {
    const row = await db.query.metadataCacheEntries.findFirst({
      where: and(
        eq(metadataCacheEntries.provider, provider),
        eq(metadataCacheEntries.cacheKey, key),
        gt(metadataCacheEntries.expiresAt, new Date()),
      ),
    });
    return row?.payload as T | undefined;
  }

  async setCached(provider: AiProviderId, key: string, payload: Record<string, unknown>, ttlMs: number) {
    const now = new Date();
    await db
      .insert(metadataCacheEntries)
      .values({
        provider,
        cacheKey: key,
        locale: "neutral",
        resourceType: "recommendation-rerank",
        payload,
        expiresAt: new Date(now.getTime() + ttlMs),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [metadataCacheEntries.provider, metadataCacheEntries.cacheKey, metadataCacheEntries.locale],
        set: { payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now },
      });
  }
}

export const aiRepository = new AiRepository();
