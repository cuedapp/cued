import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
});

export type JobRun = typeof jobRuns.$inferSelect;
