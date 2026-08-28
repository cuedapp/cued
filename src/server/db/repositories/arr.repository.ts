import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations } from "@/server/db/schema";
import type { ArrKind } from "@/server/integrations/arr/provider";

export class ArrRepository {
  constructor(private readonly provider: ArrKind) {}
  getIntegration() { return db.query.integrations.findFirst({ where: eq(integrations.provider, this.provider) }); }
  async save(input: { baseUrl: string; encryptedApiKey: string; serverName: string; serverVersion: string; configuration: Record<string, unknown> }) {
    const now = new Date();
    const [row] = await db.insert(integrations).values({ provider: this.provider, baseUrl: input.baseUrl, encryptedApiKey: input.encryptedApiKey, serverName: input.serverName, serverVersion: input.serverVersion, status: "healthy", lastCheckedAt: now, configuration: input.configuration, updatedAt: now }).onConflictDoUpdate({ target: integrations.provider, set: { ...input, status: "healthy", lastCheckedAt: now, lastError: null, updatedAt: now } }).returning();
    return row!;
  }
  async setHealth(id: string, status: "healthy" | "degraded", lastError?: string) { await db.update(integrations).set({ status, lastCheckedAt: new Date(), lastError: lastError ?? null, updatedAt: new Date() }).where(eq(integrations.id, id)); }
}
