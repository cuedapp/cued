import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { AuthService } from "../../src/server/application/auth.service";
import { BackupService } from "../../src/server/application/backup.service";
import { db, sql } from "../../src/server/db/client";
import { AuthRepository } from "../../src/server/db/repositories/auth.repository";
import { JellyfinRepository } from "../../src/server/db/repositories/jellyfin.repository";
import { MediaSyncRepository } from "../../src/server/db/repositories/media-sync.repository";
import { installationBootstrap, users } from "../../src/server/db/schema";
import { SecretEncryption } from "../../src/server/security/encryption";
import { e2eDatabaseName, e2eEncryptionKey, fakeUser } from "./constants.mjs";

// Run with the react-server condition so these checks exercise real server-only
// repositories/services in the isolated Playwright database, not module mocks.
assert.equal(new URL(process.env.DATABASE_URL!).pathname, `/${e2eDatabaseName}`);
const auth = new AuthRepository();
const sync = new MediaSyncRepository();
const jellyfin = new JellyfinRepository();
const login = new AuthService(auth, jellyfin, new SecretEncryption(e2eEncryptionKey));
const backup = new BackupService();

async function unclaimedInstallation() {
  await db.update(installationBootstrap).set({
    firstLoginCompleted: false,
    status: "pending",
    phase: "waiting",
    startedAt: null,
    completedAt: null,
    userId: null,
  });
}

async function importedUser() {
  const integration = await jellyfin.getIntegration();
  assert.ok(integration);
  return sync.upsertUser(integration.id, {
    id: fakeUser.id,
    username: fakeUser.username,
    isAdministrator: true,
    isDisabled: false,
    hasAccessToAllLibraries: true,
    enabledLibraryIds: [],
  });
}

async function irreversibleLogin() {
  await unclaimedInstallation();
  const imported = await importedUser();
  assert.equal(imported.lastLoginAt, null);
  assert.equal(await auth.hasCompletedFirstLogin(), false);

  await assert.rejects(login.login(fakeUser.username, "wrong-password"));
  assert.equal(await auth.hasCompletedFirstLogin(), false);
  await sync.setUserAccessEnabled(imported.id, false);
  await assert.rejects(login.login(fakeUser.username, fakeUser.password), /Cued access is disabled/);
  assert.equal((await auth.getUserById(imported.id))!.lastLoginAt, null);
  assert.equal(await auth.hasCompletedFirstLogin(), false);

  await sync.setUserAccessEnabled(imported.id, true);
  await sql`ALTER TABLE installation_bootstrap ADD CONSTRAINT e2e_refuse_login_claim CHECK (NOT first_login_completed)`;
  try {
    await assert.rejects(login.login(fakeUser.username, fakeUser.password), (error: unknown) => {
      if (!(error instanceof Error) || !error.cause || typeof error.cause !== "object") return false;
      return "code" in error.cause && error.cause.code === "23514";
    });
  } finally {
    await sql`ALTER TABLE installation_bootstrap DROP CONSTRAINT e2e_refuse_login_claim`;
  }
  assert.equal((await sql`SELECT count(*)::integer AS count FROM sessions`)[0]!.count, 0);
  assert.equal((await auth.getUserById(imported.id))!.lastLoginAt, null);
  assert.equal(await auth.hasCompletedFirstLogin(), false);
  const session = await login.login(fakeUser.username, fakeUser.password);
  assert.ok(await login.getSession(session.token));
  assert.ok((await auth.getUserById(imported.id))!.lastLoginAt);
  assert.equal(await auth.hasCompletedFirstLogin(), true);

  await sync.setUserAccessEnabled(imported.id, false);
  assert.equal(await login.getSession(session.token), undefined);
  assert.equal(await auth.hasCompletedFirstLogin(), true);
  const integration = await jellyfin.getIntegration();
  assert.ok(integration);
  await sync.reconcileUsers(integration.id, []);
  assert.equal(await auth.getUserById(imported.id), undefined);
  assert.equal(await auth.hasCompletedFirstLogin(), true);
  await importedUser();
  assert.equal(await auth.hasCompletedFirstLogin(), true);
  await sql`DELETE FROM integrations WHERE id = ${integration.id}`;
  assert.equal(await auth.hasCompletedFirstLogin(), true);
}

async function backupBoundary() {
  await unclaimedInstallation();
  const imported = await importedUser();
  const unclaimed = await backup.exportFull();
  await backup.restoreFull(unclaimed);
  assert.equal(await auth.hasCompletedFirstLogin(), false);

  await login.login(fakeUser.username, fakeUser.password);
  await db.delete(users).where(eq(users.id, imported.id));
  const claimed = await backup.exportFull();
  assert.equal(claimed.data.installationBootstrap[0]!.firstLoginCompleted, true);
  // Simulate restoring onto a new destination with no login history.
  await unclaimedInstallation();
  await backup.restoreFull(claimed);
  assert.equal(await auth.hasCompletedFirstLogin(), true);
  await backup.restoreFull(unclaimed);
  assert.equal(await auth.hasCompletedFirstLogin(), true);

  const legacy = JSON.parse(JSON.stringify(unclaimed)) as typeof unclaimed;
  Reflect.deleteProperty(legacy.data.installationBootstrap[0]!, "firstLoginCompleted");
  await unclaimedInstallation();
  await backup.restoreFull(legacy);
  assert.equal(await auth.hasCompletedFirstLogin(), false);
  legacy.data.installationBootstrap[0]!.status = "failed";
  legacy.data.installationBootstrap[0]!.phase = "syncing";
  legacy.data.users = [];
  await unclaimedInstallation();
  await backup.restoreFull(legacy);
  assert.equal(await auth.hasCompletedFirstLogin(), true);

  const noBootstrap = JSON.parse(JSON.stringify(unclaimed)) as typeof unclaimed;
  noBootstrap.data.installationBootstrap = [];
  await unclaimedInstallation();
  await backup.restoreFull(noBootstrap);
  assert.equal(await auth.hasCompletedFirstLogin(), false);
  Reflect.set(noBootstrap.data.users[0]!, "lastLoginAt", "2026-08-30T08:00:00.000Z");
  await unclaimedInstallation();
  await backup.restoreFull(noBootstrap);
  assert.equal(await auth.hasCompletedFirstLogin(), true);
}

async function migrationBackfill() {
  const migration = await readFile(new URL("../../drizzle/0055_durable_first_login.sql", import.meta.url), "utf8");
  const fixtures = [
    { name: "fresh imported users", claimed: false, setup: "INSERT INTO users VALUES (NULL)" },
    { name: "retained login history", claimed: true, setup: "INSERT INTO users VALUES (now())" },
    { name: "session history", claimed: true, setup: "INSERT INTO sessions VALUES (1)" },
    {
      name: "pending bootstrap with imported users",
      claimed: false,
      setup:
        "INSERT INTO users VALUES (NULL); INSERT INTO installation_bootstrap (id) VALUES (1); " +
        "INSERT INTO integration_sync_runs VALUES ('scheduled', 'completed')",
    },
    {
      name: "completed bootstrap after all users were deleted",
      claimed: true,
      setup: "INSERT INTO installation_bootstrap (id, status, phase) VALUES (1, 'completed', 'ready')",
    },
    {
      name: "deleted users after bootstrap started",
      claimed: true,
      setup: "INSERT INTO installation_bootstrap (id, status, phase) VALUES (1, 'failed', 'syncing')",
    },
    {
      name: "legacy completed sync without bootstrap row",
      claimed: true,
      setup: "INSERT INTO integration_sync_runs VALUES ('scheduled', 'completed')",
    },
    {
      name: "login-triggered sync without remaining users",
      claimed: true,
      setup: "INSERT INTO integration_sync_runs VALUES ('login', 'failed')",
    },
  ];
  for (const fixture of fixtures) {
    await sql.begin(async (tx) => {
      // Temporary tables shadow public tables only on this connection. Running
      // the committed migration here cannot mutate the live application schema.
      await tx.unsafe(`
        CREATE TEMP TABLE users (last_login_at timestamptz) ON COMMIT DROP;
        CREATE TEMP TABLE sessions (id integer) ON COMMIT DROP;
        CREATE TEMP TABLE integration_sync_runs (trigger text, status text) ON COMMIT DROP;
        CREATE TEMP TABLE installation_bootstrap (
          id integer PRIMARY KEY DEFAULT 1, status text DEFAULT 'pending', phase text DEFAULT 'waiting',
          user_id uuid, started_at timestamptz, completed_at timestamptz
        ) ON COMMIT DROP;
      `);
      await tx.unsafe(fixture.setup);
      for (const statement of migration.split("--> statement-breakpoint")) await tx.unsafe(statement);
      const [state] = await tx`SELECT first_login_completed FROM installation_bootstrap WHERE id = 1`;
      assert.equal(state!.first_login_completed, fixture.claimed, fixture.name);
    });
  }
}

const checks: Record<string, () => Promise<void>> = { irreversibleLogin, backupBoundary, migrationBackfill };
try {
  const check = checks[process.argv[2] ?? ""];
  assert.ok(check, "Unknown auth claim check");
  await check();
} finally {
  await sql.end();
}
