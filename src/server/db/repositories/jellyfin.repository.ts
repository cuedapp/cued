import "server-only";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations, mediaLibraries } from "@/server/db/schema";
import type { MediaLibrary } from "@/server/integrations/media-server-provider";

export class JellyfinRepository {
  async getIntegration() {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, "jellyfin") });
  }

  async saveIntegration(input: {
    baseUrl: string;
    encryptedApiKey?: string | null;
    serverId: string;
    serverName: string;
    serverVersion: string;
  }) {
    const now = new Date();
    const [saved] = await db.insert(integrations).values({
      provider: "jellyfin",
      baseUrl: input.baseUrl,
      encryptedApiKey: input.encryptedApiKey,
      serverId: input.serverId,
      serverName: input.serverName,
      serverVersion: input.serverVersion,
      status: "healthy",
      lastCheckedAt: now,
      lastError: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: integrations.provider,
      set: {
        baseUrl: input.baseUrl,
        ...(input.encryptedApiKey !== undefined ? { encryptedApiKey: input.encryptedApiKey } : {}),
        serverId: input.serverId,
        serverName: input.serverName,
        serverVersion: input.serverVersion,
        status: "healthy",
        lastCheckedAt: now,
        lastError: null,
        updatedAt: now,
      },
    }).returning();
    if (!saved) throw new Error("Jellyfin integration could not be saved");
    return saved;
  }

  async setHealth(integrationId: string, status: "healthy" | "degraded", error?: string) {
    const now = new Date();
    await db.update(integrations).set(status === "healthy" ? { status, lastCheckedAt: now, lastError: null, consecutiveFailures: 0, failureStartedAt: null, updatedAt: now } : { status, lastCheckedAt: now, lastError: error ?? null, consecutiveFailures: sql`${integrations.consecutiveFailures} + 1`, failureStartedAt: sql`coalesce(${integrations.failureStartedAt}, ${now})`, updatedAt: now }).where(eq(integrations.id, integrationId));
  }

  async setSyncInterval(integrationId: string, minutes: number) {
    await db.update(integrations).set({ configuration: sql`${integrations.configuration} || ${JSON.stringify({ syncIntervalMinutes: minutes })}::jsonb`, updatedAt: new Date() }).where(eq(integrations.id, integrationId));
  }

  async syncLibraries(integrationId: string, libraries: MediaLibrary[]) {
    const now = new Date();
    for (const library of libraries) {
      await db.insert(mediaLibraries).values({
        integrationId,
        jellyfinLibraryId: library.id,
        name: library.name,
        collectionType: library.collectionType,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [mediaLibraries.integrationId, mediaLibraries.jellyfinLibraryId],
        set: { name: library.name, collectionType: library.collectionType, updatedAt: now },
      });
    }
    if (libraries.length === 0) {
      await db.delete(mediaLibraries).where(eq(mediaLibraries.integrationId, integrationId));
    } else {
      await db.delete(mediaLibraries).where(and(
        eq(mediaLibraries.integrationId, integrationId),
        notInArray(mediaLibraries.jellyfinLibraryId, libraries.map((library) => library.id)),
      ));
    }
  }

  async getLibraries(integrationId: string) {
    return db.query.mediaLibraries.findMany({ where: eq(mediaLibraries.integrationId, integrationId), orderBy: (library, { asc }) => asc(library.name) });
  }

  async setSelectedLibraries(integrationId: string, selectedIds: string[]) {
    const libraries = await this.getLibraries(integrationId);
    for (const library of libraries) {
      await db.update(mediaLibraries).set({ selected: selectedIds.includes(library.jellyfinLibraryId), updatedAt: new Date() }).where(and(eq(mediaLibraries.id, library.id), eq(mediaLibraries.integrationId, integrationId)));
    }
  }
}

export const jellyfinRepository = new JellyfinRepository();
