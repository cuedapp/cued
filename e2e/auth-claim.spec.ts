import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "./fixtures";
import { e2eEncryptionKey } from "./support/constants.mjs";

const run = promisify(execFile);

async function checkClaimState(check: string) {
  const databaseUrl = process.env.CUED_E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("CUED_E2E_DATABASE_URL is required for auth claim regressions.");
  await run(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      fileURLToPath(new URL("./support/auth-claim-checks.ts", import.meta.url)),
      check,
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        CUED_ENCRYPTION_KEY: e2eEncryptionKey,
        NODE_ENV: "test",
        LOG_LEVEL: "error",
      },
      timeout: 30_000,
    },
  );
}

test("only successful login claims setup, permanently surviving disabled and reconciled users", async () => {
  await checkClaimState("irreversibleLogin");
});

test("full backup and legacy restores preserve the installation security boundary", async () => {
  await checkClaimState("backupBoundary");
});

test("the committed migration protects legacy installations without claiming imported-only users", async () => {
  await checkClaimState("migrationBackfill");
});
