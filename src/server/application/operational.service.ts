import "server-only";
import type { OperationalRepository } from "@/server/db/repositories/operational.repository";
export class OperationalService { constructor(private readonly repository: OperationalRepository) {} async overview() { const [cacheEntries, integrations] = await Promise.all([this.repository.cacheCount(), this.repository.integrationDiagnostics()]); return { cacheEntries, integrations }; } clearCaches() { return this.repository.clearCaches(); } }
