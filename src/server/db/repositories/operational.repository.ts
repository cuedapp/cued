import "server-only";
import { count } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations, metadataCacheEntries } from "@/server/db/schema";

export class OperationalRepository {
  async getCachedRelease() {
    return db.query.metadataCacheEntries.findFirst({ where: (entry, { and, eq, gt }) => and(eq(entry.provider, "github"), eq(entry.cacheKey, "latest-release"), eq(entry.locale, "neutral"), gt(entry.expiresAt, new Date())) });
  }

  async saveCachedRelease(payload: Record<string, unknown>, ttlMs: number) {
    const now = new Date();
    await db.insert(metadataCacheEntries).values({ provider: "github", cacheKey: "latest-release", locale: "neutral", resourceType: "release", payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now }).onConflictDoUpdate({ target: [metadataCacheEntries.provider, metadataCacheEntries.cacheKey, metadataCacheEntries.locale], set: { payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now } });
  }

  async clearCaches() { return (await db.delete(metadataCacheEntries).returning({ id: metadataCacheEntries.id })).length; }
  async cacheCount() { const [result] = await db.select({ value: count() }).from(metadataCacheEntries); return Number(result?.value ?? 0); }
  async integrationDiagnostics() { return db.select({ provider: integrations.provider, status: integrations.status, lastCheckedAt: integrations.lastCheckedAt, lastError: integrations.lastError }).from(integrations); }
}

export const operationalRepository = new OperationalRepository();
