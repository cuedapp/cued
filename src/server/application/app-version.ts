import packageJson from "../../../package.json";

export function resolveAppVersion(injectedVersion = process.env.CUED_VERSION) {
  return injectedVersion || packageJson.version;
}

export const appVersion = resolveAppVersion();
