import "server-only";

import type { SetupWizardSnapshot } from "@/lib/setup-wizard";
import {
  aiIntegrationService,
  jellyfinIntegrationService,
  m3uEditorIntegrationService,
  notificationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbIntegrationService,
} from "@/server/application/services";
import { getSecretEncryption } from "@/server/security/secrets";

export function isSetupWizardEncryptionConfigured() {
  try {
    getSecretEncryption();
    return true;
  } catch {
    return false;
  }
}

export class SetupWizardService {
  async getOverview() {
    const encryptionConfigured = isSetupWizardEncryptionConfigured();
    const [jellyfin, tmdb, openai, openrouter, radarr, sonarr, m3uEditor, ntfy] = await Promise.all([
      jellyfinIntegrationService.getOverview(),
      tmdbIntegrationService.getOverview(),
      aiIntegrationService.getOverview("openai"),
      aiIntegrationService.getOverview("openrouter"),
      radarrIntegrationService.getOverview(),
      sonarrIntegrationService.getOverview(),
      m3uEditorIntegrationService.getOverview(),
      notificationService.getNtfyOverview(),
    ]);

    const snapshot: SetupWizardSnapshot = {
      providers: {
        jellyfin: jellyfin.configured,
        tmdb: tmdb.configured,
        openai: openai.configured,
        openrouter: openrouter.configured,
        radarr: radarr.configured,
        sonarr: sonarr.configured,
        "m3u-editor": m3uEditor.configured,
        ntfy: ntfy.configured,
      },
      healthy: {
        jellyfin: jellyfin.status === "healthy",
        tmdb: tmdb.status === "healthy",
        openai: openai.status === "healthy",
        openrouter: openrouter.status === "healthy",
        radarr: radarr.status === "healthy",
        sonarr: sonarr.status === "healthy",
        "m3u-editor": m3uEditor.status === "healthy",
        ntfy: ntfy.status === "healthy",
      },
      jellyfinLibrariesSelected: jellyfin.libraries.some((library) => library.selected),
    };

    return { encryptionConfigured, snapshot, jellyfin, tmdb, openai, openrouter, radarr, sonarr, m3uEditor, ntfy };
  }
}

export type SetupWizardOverview = Awaited<ReturnType<SetupWizardService["getOverview"]>>;
export const setupWizardService = new SetupWizardService();
