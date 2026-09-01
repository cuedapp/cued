import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import type { MediaServerUser } from "@/server/integrations/media-server-provider";

export class AuthRepository {
  async hasUsers() {
    return db
      .select({ id: users.id })
      .from(users)
      .limit(1)
      .then((rows) => rows.length > 0);
  }

  async getUserById(userId: string) {
    return db.query.users.findFirst({ where: eq(users.id, userId) });
  }

  async upsertUser(integrationId: string, jellyfinUser: MediaServerUser, recordLogin = true) {
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
        lastLoginAt: recordLogin ? now : undefined,
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
          ...(recordLogin ? { lastLoginAt: now } : {}),
          updatedAt: now,
        },
      })
      .returning();
    if (!user) throw new Error("Cued user could not be saved");
    return user;
  }

  async createSession(input: { userId: string; tokenHash: string; encryptedAccessToken: string; expiresAt: Date }) {
    await db.insert(sessions).values(input);
  }

  async getSession(tokenHash: string) {
    return db
      .select({ user: users, session: sessions })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()), eq(users.disabled, false)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  async deleteSession(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}

export const authRepository = new AuthRepository();
