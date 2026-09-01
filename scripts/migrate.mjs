import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

const databaseUrl = z.string().url().startsWith("postgresql://").parse(process.env.DATABASE_URL);
const client = postgres(databaseUrl, { max: 1 });

try {
  console.log(
    JSON.stringify({ timestamp: new Date().toISOString(), level: "info", message: "Applying database migrations" }),
  );
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log(
    JSON.stringify({ timestamp: new Date().toISOString(), level: "info", message: "Database migrations complete" }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Database migration failed",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
