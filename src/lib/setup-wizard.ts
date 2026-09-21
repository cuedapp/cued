export const setupWizardProviderIds = [
  "jellyfin",
  "tmdb",
  "openai",
  "openrouter",
  "radarr",
  "sonarr",
  "m3u-editor",
  "ntfy",
] as const;

export type SetupWizardProviderId = (typeof setupWizardProviderIds)[number];

export const setupWizardStepIds = ["jellyfin", "tmdb", "acquisition", "ai", "notifications", "review"] as const;

export type SetupWizardStepId = (typeof setupWizardStepIds)[number];
export type SetupWizardStepState = "todo" | "done";

export interface SetupWizardSnapshot {
  providers: Partial<Record<SetupWizardProviderId, boolean>>;
  healthy: Partial<Record<SetupWizardProviderId, boolean>>;
  jellyfinLibrariesSelected: boolean;
}

const stepProviders: Record<Exclude<SetupWizardStepId, "review">, readonly SetupWizardProviderId[]> = {
  jellyfin: ["jellyfin"],
  tmdb: ["tmdb"],
  acquisition: ["radarr", "sonarr", "m3u-editor"],
  ai: ["openai", "openrouter"],
  notifications: ["ntfy"],
};

export function parseSetupWizardStep(value: string | undefined | null): SetupWizardStepId | undefined {
  return setupWizardStepIds.find((step) => step === value);
}

export function isSetupWizardStepRequired(step: SetupWizardStepId): boolean {
  return step === "jellyfin" || step === "tmdb";
}

export function isSetupWizardVisible(snapshot: SetupWizardSnapshot): boolean {
  return !snapshot.providers.jellyfin || !snapshot.providers.tmdb;
}

export function canFinishSetupWizard(snapshot: SetupWizardSnapshot): boolean {
  return Boolean(snapshot.healthy.jellyfin && snapshot.healthy.tmdb && snapshot.jellyfinLibrariesSelected);
}

export function deriveSetupWizardStepState(
  step: SetupWizardStepId,
  snapshot: SetupWizardSnapshot,
): SetupWizardStepState {
  if (step === "review") return "done";
  if (step === "jellyfin") {
    return snapshot.providers.jellyfin && snapshot.jellyfinLibrariesSelected ? "done" : "todo";
  }
  const configured = stepProviders[step].filter((provider) => snapshot.providers[provider]);
  const complete = isSetupWizardStepRequired(step)
    ? configured.length === stepProviders[step].length
    : configured.length > 0;
  return complete ? "done" : "todo";
}

export function getSetupWizardStepStates(
  snapshot: SetupWizardSnapshot,
): Record<SetupWizardStepId, SetupWizardStepState> {
  return Object.fromEntries(
    setupWizardStepIds.map((step) => [step, deriveSetupWizardStepState(step, snapshot)]),
  ) as Record<SetupWizardStepId, SetupWizardStepState>;
}

export function getFirstIncompleteSetupWizardStep(snapshot: SetupWizardSnapshot): SetupWizardStepId {
  return setupWizardStepIds.find((step) => deriveSetupWizardStepState(step, snapshot) === "todo") ?? "review";
}

export function getNextSetupWizardStep(step: SetupWizardStepId): SetupWizardStepId | undefined {
  return setupWizardStepIds[setupWizardStepIds.indexOf(step) + 1];
}

export function getPreviousSetupWizardStep(step: SetupWizardStepId): SetupWizardStepId | undefined {
  const index = setupWizardStepIds.indexOf(step);
  return index > 0 ? setupWizardStepIds[index - 1] : undefined;
}
