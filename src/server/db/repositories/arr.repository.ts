import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations } from "@/server/db/schema";
import type { ArrKind } from "@/server/integrations/arr/provider";

export class ArrRepository {
  constructor(private readonly provider: ArrKind) {}
  getIntegration() {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, this.provider) });
  }
  async save(input: {
    baseUrl: string;
    encryptedApiKey: string;
    serverName: string;
    serverVersion: string;
    configuration: Record<string, unknown>;
  }) {
    const now = new Date();
    const [row] = await db
      .insert(integrations)
      .values({
        provider: this.provider,
        baseUrl: input.baseUrl,
        encryptedApiKey: input.encryptedApiKey,
        serverName: input.serverName,
        serverVersion: input.serverVersion,
        status: "healthy",
        lastCheckedAt: now,
        configuration: input.configuration,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: integrations.provider,
        set: { ...input, status: "healthy", lastCheckedAt: now, lastError: null, updatedAt: now },
      })
      .returning();
    return row!;
  }
  async setHealth(id: string, status: "healthy" | "degraded", lastError?: string) {
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
              lastError: lastError ?? null,
              consecutiveFailures: sql`${integrations.consecutiveFailures} + 1`,
              failureStartedAt: sql`coalesce(${integrations.failureStartedAt}, ${now})`,
              updatedAt: now,
            },
      )
      .where(eq(integrations.id, id));
  }
}
