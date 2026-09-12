import type { UserPreferencesRepository } from "@/server/db/repositories/user-preferences.repository";
import type { DateFormat, TimeFormat } from "@/lib/date-time";

export class UserPreferencesService {
  constructor(private readonly repository: UserPreferencesRepository) {}

  updateDisplayPreferences(userId: string, input: { dateFormat: DateFormat; timeFormat: TimeFormat }) {
    return this.repository.updateDisplayPreferences(userId, input.dateFormat, input.timeFormat);
  }
  updateLocale(userId: string, locale: "en" | "sv" | "nl") {
    return this.repository.updateLocale(userId, locale);
  }
  updatePreferredOriginalLanguages(userId: string, languages: string[]) {
    return this.repository.updatePreferredOriginalLanguages(userId, languages);
  }
}
