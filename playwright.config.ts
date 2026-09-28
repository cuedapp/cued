import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { e2eEncryptionKey } from "./e2e/support/constants.mjs";

const port = Number(process.env.CUED_E2E_PORT ?? 3004);
const baseURL = `http://127.0.0.1:${port}`;
const databaseURL = process.env.CUED_E2E_DATABASE_URL;
if (!databaseURL)
  throw new Error("Set CUED_E2E_DATABASE_URL to the dedicated cued_e2e database before running Playwright.");
const tmdbFetchShim = fileURLToPath(new URL("./e2e/support/route-tmdb-fetch.mjs", import.meta.url));
const nodeOptions = `${process.env.NODE_OPTIONS ?? ""} --import=${tmdbFetchShim}`.trim();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/support/fake-providers.mjs",
      url: "http://127.0.0.1:4173/healthz",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: process.env.CI
        ? "mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && node .next/standalone/server.js"
        : `node node_modules/next/dist/bin/next dev --port ${port}`,
      url: `${baseURL}/en/setup/jellyfin`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        DATABASE_URL: databaseURL,
        CUED_ENCRYPTION_KEY: e2eEncryptionKey,
        NODE_OPTIONS: nodeOptions,
      },
    },
  ],
});
