import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { SecretEncryption } from "@/server/security/encryption";
import { e2eDatabaseName, e2eEncryptionKey, fakeJellyfinBaseUrl, fakeJellyfinServerId } from "./constants.mjs";

export async function prepareE2EDatabase(databaseUrl: string) {
  const database = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    await migrate(drizzle(database), { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) });
    await seedE2EDatabase(database);
  } finally {
    await database.end();
  }
}

export async function resetE2EDatabase() {
  const databaseUrl = process.env.CUED_E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("CUED_E2E_DATABASE_URL is required to reset E2E data.");

  const target = new URL(databaseUrl);
  if (decodeURIComponent(target.pathname.slice(1)) !== e2eDatabaseName) {
    throw new Error(`E2E database must be named exactly ${e2eDatabaseName}; refusing to reset another database.`);
  }

  const database = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    await seedE2EDatabase(database);
  } finally {
    await database.end();
  }
}

async function seedE2EDatabase(database: Sql) {
  await database.unsafe(`
    DO $e2e$
    DECLARE table_row record;
    BEGIN
      FOR table_row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', table_row.tablename);
      END LOOP;
    END
    $e2e$;
  `);

  const encryption = new SecretEncryption(e2eEncryptionKey);
  await database`
    INSERT INTO integrations (
      provider, base_url, encrypted_api_key, server_id, server_name, server_version, status, configuration
    ) VALUES (
      'jellyfin', ${fakeJellyfinBaseUrl}, ${encryption.encrypt("e2e-jellyfin-api-key")},
      ${fakeJellyfinServerId}, 'E2E Jellyfin', '10.10.0', 'healthy', '{"syncIntervalMinutes":1440}'::jsonb
    )
  `;
  await database`
    INSERT INTO integrations (provider, base_url, encrypted_api_key, server_name, status)
    VALUES ('tmdb', 'https://api.themoviedb.org/3', ${encryption.encrypt("e2e-tmdb-access-token")}, 'TMDB', 'healthy')
  `;
  await database`
    INSERT INTO installation_bootstrap (id, status, phase, locale, completed_at)
    VALUES (1, 'completed', 'ready', 'en', now())
    ON CONFLICT (id) DO UPDATE SET
      status = 'completed', phase = 'ready', locale = 'en', completed_at = now(), updated_at = now()
  `;
}
