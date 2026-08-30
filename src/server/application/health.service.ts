export type DatabaseProbe = () => Promise<void>;

export interface HealthReport {
  status: "ok" | "degraded";
  application: "ok";
  database: "ok" | "error";
  version: string;
  encryption: "configured" | "unconfigured";
  timestamp: string;
}

export class HealthService {
  constructor(private readonly probeDatabase: DatabaseProbe, private readonly version = "unknown", private readonly encryptionConfigured = false) {}

  async check(): Promise<HealthReport> {
    try {
      await this.probeDatabase();
      return { status: "ok", application: "ok", database: "ok", version: this.version, encryption: this.encryptionConfigured ? "configured" : "unconfigured", timestamp: new Date().toISOString() };
    } catch {
      return { status: "degraded", application: "ok", database: "error", version: this.version, encryption: this.encryptionConfigured ? "configured" : "unconfigured", timestamp: new Date().toISOString() };
    }
  }
}
