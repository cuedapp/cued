import { describe, expect, it } from "vitest";
import {
  canFinishSetupWizard,
  deriveSetupWizardStepState,
  getFirstIncompleteSetupWizardStep,
  getNextSetupWizardStep,
  getPreviousSetupWizardStep,
  getSetupWizardStepStates,
  isSetupWizardStepRequired,
  isSetupWizardVisible,
  parseSetupWizardStep,
  type SetupWizardSnapshot,
} from "@/lib/setup-wizard";

const emptySnapshot: SetupWizardSnapshot = { providers: {}, healthy: {}, jellyfinLibrariesSelected: false };

function snapshot(
  providers: SetupWizardSnapshot["providers"],
  jellyfinLibrariesSelected = false,
  healthy: SetupWizardSnapshot["healthy"] = {},
): SetupWizardSnapshot {
  return { providers, healthy, jellyfinLibrariesSelected };
}

describe("setup wizard model", () => {
  it("is visible until both core providers have integration rows", () => {
    expect(isSetupWizardVisible(emptySnapshot)).toBe(true);
    expect(isSetupWizardVisible(snapshot({ jellyfin: true }))).toBe(true);
    expect(isSetupWizardVisible(snapshot({ tmdb: true }))).toBe(true);
    expect(isSetupWizardVisible(snapshot({ jellyfin: true, tmdb: true }))).toBe(false);
  });

  it("keeps the wizard visible when only optional providers are configured", () => {
    const onlyOptional = snapshot({
      openai: true,
      radarr: true,
      sonarr: true,
      "m3u-editor": true,
      ntfy: true,
    });

    expect(isSetupWizardVisible(onlyOptional)).toBe(true);
    expect(canFinishSetupWizard(onlyOptional)).toBe(false);
  });

  it("allows finishing only when both core providers are healthy and libraries are selected", () => {
    expect(canFinishSetupWizard(emptySnapshot)).toBe(false);
    expect(canFinishSetupWizard(snapshot({ jellyfin: true, tmdb: true }, true))).toBe(false);
    expect(canFinishSetupWizard(snapshot({ jellyfin: true, tmdb: true }, true, { jellyfin: true, tmdb: true }))).toBe(
      true,
    );
    expect(canFinishSetupWizard(snapshot({ jellyfin: true, tmdb: true }, true, { jellyfin: true, tmdb: false }))).toBe(
      false,
    );
  });

  it("parses only known wizard steps", () => {
    expect(parseSetupWizardStep("jellyfin")).toBe("jellyfin");
    expect(parseSetupWizardStep("review")).toBe("review");
    expect(parseSetupWizardStep("unknown")).toBeUndefined();
    expect(parseSetupWizardStep(undefined)).toBeUndefined();
  });

  it("marks core steps complete only when every provider is configured", () => {
    expect(deriveSetupWizardStepState("jellyfin", emptySnapshot)).toBe("todo");
    expect(deriveSetupWizardStepState("jellyfin", snapshot({ jellyfin: true }))).toBe("todo");
    expect(deriveSetupWizardStepState("jellyfin", snapshot({ jellyfin: true }, true))).toBe("done");
    expect(deriveSetupWizardStepState("tmdb", snapshot({ tmdb: true }))).toBe("done");
    expect(deriveSetupWizardStepState("acquisition", snapshot({ radarr: true }))).toBe("done");
    expect(deriveSetupWizardStepState("acquisition", snapshot({ radarr: true, sonarr: true }))).toBe("done");
    expect(deriveSetupWizardStepState("ai", snapshot({ openrouter: true }))).toBe("done");
    expect(deriveSetupWizardStepState("notifications", emptySnapshot)).toBe("todo");
    expect(deriveSetupWizardStepState("review", emptySnapshot)).toBe("done");
  });

  it("derives every step state from one snapshot", () => {
    expect(getSetupWizardStepStates(snapshot({ jellyfin: true, sonarr: true }, true))).toEqual({
      jellyfin: "done",
      tmdb: "todo",
      acquisition: "done",
      ai: "todo",
      notifications: "todo",
      review: "done",
    });
  });

  it("selects the first incomplete step for wizard entry", () => {
    expect(getFirstIncompleteSetupWizardStep(emptySnapshot)).toBe("jellyfin");
    expect(getFirstIncompleteSetupWizardStep(snapshot({ jellyfin: true }))).toBe("jellyfin");
    expect(getFirstIncompleteSetupWizardStep(snapshot({ jellyfin: true }, true))).toBe("tmdb");
    expect(getFirstIncompleteSetupWizardStep(snapshot({ jellyfin: true, tmdb: true }, true))).toBe("acquisition");
    expect(getFirstIncompleteSetupWizardStep(snapshot({ jellyfin: true, tmdb: true, radarr: true }, true))).toBe("ai");
  });

  it("navigates within the fixed step order", () => {
    expect(getPreviousSetupWizardStep("jellyfin")).toBeUndefined();
    expect(getNextSetupWizardStep("jellyfin")).toBe("tmdb");
    expect(getNextSetupWizardStep("notifications")).toBe("review");
    expect(getNextSetupWizardStep("review")).toBeUndefined();
    expect(getPreviousSetupWizardStep("review")).toBe("notifications");
    expect(isSetupWizardStepRequired("jellyfin")).toBe(true);
    expect(isSetupWizardStepRequired("tmdb")).toBe(true);
    expect(isSetupWizardStepRequired("acquisition")).toBe(false);
  });
});
