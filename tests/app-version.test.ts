import { describe, expect, it } from "vitest";
import { appVersion, resolveAppVersion } from "@/server/application/app-version";
import packageJson from "../package.json";

describe("appVersion", () => {
  it("uses the package version when no release build version is injected", () => {
    expect(appVersion).toBe(packageJson.version);
  });

  it("uses a version injected by a release image", () => {
    expect(resolveAppVersion("v1.2.3")).toBe("v1.2.3");
  });
});
