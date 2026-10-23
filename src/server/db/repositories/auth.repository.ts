import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { installationBootstrap, sessions, users } from "@/server/db/schema";
import type { MediaServerUser } from "@/server/integrations/media-server-provider";

export class AuthRepository {
  async hasCompletedFirstLogin() {
    const state = await db.query.installationBootstrap.findFirst({
      where: eq(installationBootstrap.id, 1),
      columns: { firstLoginCompleted: true },
    });
    return state?.firstLoginCompleted ?? false;
  }

  async getUserById(userId: string) {
    return db.query.users.findFirst({ where: eq(users.id, userId) });
  }

  async upsertUser(integrationId: string, jellyfinUser: MediaServerUser) {
    const now = new Date();
    const [user] = await db
      .insert(users)
      .values({
        integrationId,
        jellyfinUserId: jellyfinUser.id,
        username: jellyfinUser.username,
        displayName: jellyfinUser.username,
        primaryImageTag: jellyfinUser.primaryImageTag,
        role: jellyfinUser.isAdministrator ? "admin" : "user",
        disabled: jellyfinUser.isDisabled,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [users.integrationId, users.jellyfinUserId],
        set: {
          username: jellyfinUser.username,
          displayName: jellyfinUser.username,
          primaryImageTag: jellyfinUser.primaryImageTag ?? null,
          role: jellyfinUser.isAdministrator ? "admin" : "user",
          disabled: jellyfinUser.isDisabled,
          updatedAt: now,
        },
      })
      .returning();
    if (!user) throw new Error("Cued user could not be saved");
    return user;
  }

  async createSession(input: { userId: string; tokenHash: string; encryptedAccessToken: string; expiresAt: Date }) {
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx.insert(sessions).values(input);
      await tx.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, input.userId));
      await tx
        .insert(installationBootstrap)
        .values({ id: 1, firstLoginCompleted: true })
        .onConflictDoUpdate({
          target: installationBootstrap.id,
          set: { firstLoginCompleted: true, updatedAt: now },
        });
    });
  }

  async getSession(tokenHash: string) {
    return db
      .select({ user: users, session: sessions })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
  }

  async deleteSession(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}

export const authRepository = new AuthRepository();
