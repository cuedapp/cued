import type { VisibilityRepository, VisibilitySettings } from "@/server/db/repositories/visibility.repository";

export class VisibilityService {
  constructor(private readonly repository: VisibilityRepository) {}

  getSettings() {
    return this.repository.get();
  }

  saveSettings(settings: VisibilitySettings) {
    return this.repository.save(settings);
  }
}
