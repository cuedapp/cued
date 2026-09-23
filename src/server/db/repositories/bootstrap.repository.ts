import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { installationBootstrap, type InstallationBootstrap } from "@/server/db/schema";

const bootstrapId = 1;

export type BootstrapStatus = "pending" | "running" | "failed" | "completed";
export type BootstrapPhase = "waiting" | "syncing" | "recommendations" | "ready";

export class BootstrapRepository {
  async get(): Promise<InstallationBootstrap> {
    await db.insert(installationBootstrap).values({ id: bootstrapId }).onConflictDoNothing();
    const state = await db.query.installationBootstrap.findFirst({
      where: eq(installationBootstrap.id, bootstrapId),
    });
    if (!state) throw new Error("Installation bootstrap state could not be loaded");
    return state;
  }

  claim(userId: string, locale: string, expectedStatus: "pending" | "failed") {
    const now = new Date();
    return db
      .update(installationBootstrap)
      .set({
        status: "running",
        phase: "syncing",
        userId,
        locale,
        error: null,
        startedAt: now,
        completedAt: null,
        updatedAt: now,
      })
      .where(and(eq(installationBootstrap.id, bootstrapId), eq(installationBootstrap.status, expectedStatus)))
      .returning()
      .then((rows) => rows[0]);
  }

  advanceToRecommendations() {
    return this.transition("syncing", "recommendations");
  }

  complete() {
    const now = new Date();
    return db
      .update(installationBootstrap)
      .set({ status: "completed", phase: "ready", error: null, completedAt: now, updatedAt: now })
      .where(
        and(
          eq(installationBootstrap.id, bootstrapId),
          eq(installationBootstrap.status, "running"),
          eq(installationBootstrap.phase, "recommendations"),
        ),
      )
      .returning({ id: installationBootstrap.id })
      .then((rows) => rows.length > 0);
  }

  fail(phase: "syncing" | "recommendations", error: string) {
    return db
      .update(installationBootstrap)
      .set({ status: "failed", phase, error: error.slice(0, 1_000), updatedAt: new Date() })
      .where(
        and(
          eq(installationBootstrap.id, bootstrapId),
          eq(installationBootstrap.status, "running"),
          eq(installationBootstrap.phase, phase),
        ),
      )
      .returning({ id: installationBootstrap.id })
      .then((rows) => rows.length > 0);
  }

  private transition(from: "syncing", to: "recommendations") {
    return db
      .update(installationBootstrap)
      .set({ phase: to, error: null, updatedAt: new Date() })
      .where(
        and(
          eq(installationBootstrap.id, bootstrapId),
          eq(installationBootstrap.status, "running"),
          eq(installationBootstrap.phase, from),
        ),
      )
      .returning({ id: installationBootstrap.id })
      .then((rows) => rows.length > 0);
  }
}

export const bootstrapRepository = new BootstrapRepository();
