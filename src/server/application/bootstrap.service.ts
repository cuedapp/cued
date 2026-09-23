import { logger } from "@/lib/logger";
import type { MediaSyncService } from "@/server/application/media-sync.service";
import type { RecommendationService } from "@/server/application/recommendation.service";
import type {
  BootstrapPhase,
  BootstrapRepository,
  BootstrapStatus,
} from "@/server/db/repositories/bootstrap.repository";
import type { InstallationBootstrap } from "@/server/db/schema";

export type BootstrapState = {
  status: BootstrapStatus;
  phase: BootstrapPhase;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export class BootstrapService {
  private continuing = false;

  constructor(
    private readonly repository: BootstrapRepository,
    private readonly mediaSync: MediaSyncService,
    private readonly recommendations: RecommendationService,
  ) {}

  async getState(): Promise<BootstrapState> {
    return present(await this.repository.get());
  }

  async start(userId: string, locale: string) {
    await this.repository.get();
    const state = await this.repository.claim(userId, locale, "pending");
    if (!state) return false;
    this.launch(state);
    return true;
  }

  async retry(userId: string, locale: string) {
    const state = await this.repository.claim(userId, locale, "failed");
    if (!state) return false;
    this.launch(state);
    return true;
  }

  async reconcile() {
    const state = await this.repository.get();
    if (state.status === "running") this.launch(state);
    return present(state);
  }

  private launch(state: InstallationBootstrap) {
    if (this.continuing) return;
    this.continuing = true;
    void this.continue(state).finally(() => {
      this.continuing = false;
    });
  }

  private async continue(state: InstallationBootstrap) {
    try {
      if (state.phase === "syncing") await this.continueSync(state);
      else if (state.phase === "recommendations") await this.continueRecommendations(state);
    } catch (error) {
      const phase = state.phase === "recommendations" ? "recommendations" : "syncing";
      const latestRun = phase === "syncing" ? await this.mediaSync.getLatestRun().catch(() => undefined) : undefined;
      if (latestRun?.status === "running") return;
      const code = error instanceof Error && error.name === "JellyfinSyncCancelledError" ? "cancelled" : "failed";
      await this.repository.fail(phase, code);
      logger.error("Installation bootstrap failed", {
        phase,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  private async continueSync(state: InstallationBootstrap) {
    if (!state.userId) throw new Error("Bootstrap user is unavailable");
    const latest = await this.mediaSync.getLatestRun();
    if (latest?.status === "running") return;
    if (latest && finishedDuringBootstrap(latest, state)) {
      if (latest.status === "failed") {
        await this.repository.fail("syncing", latest.error === "cancelled" ? "cancelled" : "failed");
        return;
      }
      if (latest.status === "completed") {
        await this.advanceToRecommendations();
        return;
      }
    }

    await this.mediaSync.sync("login", state.userId, "full");
    await this.advanceToRecommendations();
  }

  private async advanceToRecommendations() {
    if (!(await this.repository.advanceToRecommendations())) return;
    await this.continueRecommendations(await this.repository.get());
  }

  private async continueRecommendations(state: InstallationBootstrap) {
    if (!state.userId) throw new Error("Bootstrap user is unavailable");
    const recommendationStatus = await this.recommendations.getStatus(state.userId);
    const run = recommendationStatus.run;
    if (run?.status === "running") return;
    if (run && finishedDuringBootstrap(run, state)) {
      if (run.status === "failed") {
        await this.repository.fail("recommendations", "failed");
        return;
      }
      if (run.status === "completed") {
        await this.repository.complete();
        return;
      }
    }

    const started = await this.recommendations.refreshAndWait(state.userId, state.locale, true);
    if (started) await this.repository.complete();
  }
}

function finishedDuringBootstrap(
  run: { status: string; finishedAt?: Date | null } | undefined,
  state: InstallationBootstrap,
) {
  return Boolean(run?.finishedAt && state.startedAt && run.finishedAt.getTime() >= state.startedAt.getTime());
}

function present(state: InstallationBootstrap): BootstrapState {
  return {
    status: state.status as BootstrapStatus,
    phase: state.phase as BootstrapPhase,
    ...(state.error ? { error: state.error } : {}),
    ...(state.startedAt ? { startedAt: state.startedAt.toISOString() } : {}),
    ...(state.completedAt ? { completedAt: state.completedAt.toISOString() } : {}),
  };
}
