import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

export class UserPreferencesRepository {
  async updateDisplayPreferences(userId: string, dateFormat: string, timeFormat: string) {
    await db.update(users).set({ dateFormat, timeFormat, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const userPreferencesRepository = new UserPreferencesRepository();
