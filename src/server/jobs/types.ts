export interface Job {
  readonly name: string;
  run(): Promise<void>;
}

export interface JobExecution {
  jobName: string;
  startedAt: Date;
  finishedAt: Date;
  status: "completed" | "failed";
  error?: string;
}
