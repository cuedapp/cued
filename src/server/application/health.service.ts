export type DatabaseProbe = () => Promise<void>;

export interface HealthReport {
  status: "ok" | "degraded";
  application: "ok";
  database: "ok" | "error";
  timestamp: string;
}

export class HealthService {
  constructor(private readonly probeDatabase: DatabaseProbe) {}

  async check(): Promise<HealthReport> {
    try {
      await this.probeDatabase();
      return { status: "ok", application: "ok", database: "ok", timestamp: new Date().toISOString() };
    } catch {
      return { status: "degraded", application: "ok", database: "error", timestamp: new Date().toISOString() };
    }
  }
}
