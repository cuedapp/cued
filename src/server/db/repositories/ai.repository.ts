import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations, metadataCacheEntries, userTasteProfiles } from "@/server/db/schema";
import type { AiMode, TasteProfile } from "@/server/integrations/ai/provider";

export class AiRepository {
  async getIntegration() { return db.query.integrations.findFirst({ where: eq(integrations.provider, "openai") }); }

  async saveIntegration(encryptedApiKey: string | null, mode: AiMode, model: string) {
    const now = new Date();
    const [saved] = await db.insert(integrations).values({ provider: "openai", baseUrl: "https://api.openai.com/v1", encryptedApiKey, serverName: "OpenAI", configuration: { mode, model }, status: mode === "off" ? "unconfigured" : "healthy", lastCheckedAt: mode === "off" ? null : now, updatedAt: now }).onConflictDoUpdate({ target: integrations.provider, set: { encryptedApiKey, configuration: { mode, model }, status: mode === "off" ? "unconfigured" : "healthy", lastError: null, updatedAt: now } }).returning();
    if (!saved) throw new Error("OpenAI integration could not be saved");
    return saved;
  }

  async setHealth(id: string, status: "healthy" | "degraded", error?: string) { const now = new Date(); await db.update(integrations).set(status === "healthy" ? { status, lastCheckedAt: now, lastError: null, consecutiveFailures: 0, failureStartedAt: null, updatedAt: now } : { status, lastCheckedAt: now, lastError: error ?? null, consecutiveFailures: sql`${integrations.consecutiveFailures} + 1`, failureStartedAt: sql`coalesce(${integrations.failureStartedAt}, ${now})`, updatedAt: now }).where(eq(integrations.id, id)); }

  async getProfile(userId: string) { return db.query.userTasteProfiles.findFirst({ where: eq(userTasteProfiles.userId, userId) }); }

  async saveProfile(userId: string, fingerprint: string, provider: string, model: string, profile: TasteProfile, sourceMediaCount: number) {
    const now = new Date();
    const storedProfile = profile as unknown as Record<string, unknown>;
    await db.insert(userTasteProfiles).values({ userId, onboardingStatus: "completed", profile: storedProfile, signalFingerprint: fingerprint, provider, model, sourceMediaCount, completedAt: now, generatedAt: now, updatedAt: now }).onConflictDoUpdate({ target: userTasteProfiles.userId, set: { profile: storedProfile, signalFingerprint: fingerprint, provider, model, sourceMediaCount, onboardingStatus: "completed", completedAt: now, generatedAt: now, updatedAt: now } });
  }

  async getCached<T>(key: string): Promise<T | undefined> {
    const row = await db.query.metadataCacheEntries.findFirst({ where: and(eq(metadataCacheEntries.provider, "openai"), eq(metadataCacheEntries.cacheKey, key), gt(metadataCacheEntries.expiresAt, new Date())) });
    return row?.payload as T | undefined;
  }

  async setCached(key: string, payload: Record<string, unknown>, ttlMs: number) {
    const now = new Date();
    await db.insert(metadataCacheEntries).values({ provider: "openai", cacheKey: key, locale: "neutral", resourceType: "recommendation-rerank", payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now }).onConflictDoUpdate({ target: [metadataCacheEntries.provider, metadataCacheEntries.cacheKey, metadataCacheEntries.locale], set: { payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now } });
  }
}

export const aiRepository = new AiRepository();
