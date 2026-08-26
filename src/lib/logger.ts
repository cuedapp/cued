import { env } from "@/env";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const weights: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function write(level: Level, message: string, fields: Fields = {}) {
  if (weights[level] < weights[env.LOG_LEVEL]) return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(`${entry}\n`);
}

export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
