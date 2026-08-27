import type { UserPreferencesRepository } from "@/server/db/repositories/user-preferences.repository";

export class UserPreferencesService {
  constructor(private readonly repository: UserPreferencesRepository) {}

  updateDisplayPreferences(userId: string, input: { dateFormat: "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy"; timeFormat: "24h" | "12h" }) {
    return this.repository.updateDisplayPreferences(userId, input.dateFormat, input.timeFormat);
  }
}
