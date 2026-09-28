import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import postgres from "postgres";
import { e2eDatabaseName, e2eEncryptionKey } from "../e2e/support/constants.mjs";
import { prepareE2EDatabase } from "../e2e/support/database";

const explicitDatabaseUrl = process.env.CUED_E2E_DATABASE_URL;
const sourceDatabaseUrl = explicitDatabaseUrl ?? process.env.DATABASE_URL;
if (!sourceDatabaseUrl) {
  throw new Error("Set CUED_E2E_DATABASE_URL or a local DATABASE_URL; E2E requires its isolated cued_e2e database.");
}

const target = new URL(sourceDatabaseUrl);
if (!explicitDatabaseUrl) {
  if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname)) {
    throw new Error(
      "Set CUED_E2E_DATABASE_URL explicitly; automatic E2E database selection only accepts local PostgreSQL.",
    );
  }
  target.pathname = `/${e2eDatabaseName}`;
}
if (!target.protocol.startsWith("postgres") || decodeURIComponent(target.pathname.slice(1)) !== e2eDatabaseName) {
  throw new Error(`E2E database must be named exactly ${e2eDatabaseName}; refusing to modify another database.`);
}
const databaseUrl = target.toString();

const adminUrl = new URL(target);
adminUrl.pathname = "/postgres";
const admin = postgres(adminUrl.toString(), { max: 1 });
try {
  const [existing] = await admin`select 1 from pg_database where datname = ${e2eDatabaseName}`;
  if (!existing) await admin.unsafe(`CREATE DATABASE "${e2eDatabaseName}"`);
} finally {
  await admin.end();
}
const appServer = createServer();
await new Promise<void>((resolve, reject) => {
  appServer.once("error", reject);
  appServer.listen(0, "127.0.0.1", resolve);
});
const appAddress = appServer.address();
if (!appAddress || typeof appAddress === "string") throw new Error("Could not allocate an E2E application port.");
await new Promise<void>((resolve, reject) => {
  appServer.close((error) => (error ? reject(error) : resolve()));
});

await prepareE2EDatabase(databaseUrl);

process.env.DATABASE_URL = databaseUrl;
process.env.CUED_E2E_DATABASE_URL = databaseUrl;
process.env.CUED_E2E_PORT = String(appAddress.port);
process.env.CUED_ENCRYPTION_KEY = e2eEncryptionKey;
const result = spawnSync("pnpm", ["exec", "playwright", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exitCode = result.status ?? 1;
