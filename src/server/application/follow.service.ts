import type { AcquisitionService } from "./acquisition.service";
import type { TmdbMetadataService } from "./tmdb-metadata.service";
import type { FollowRepository, FollowTargetType } from "@/server/db/repositories/follow.repository";

export class FollowService {
  constructor(
    private readonly repository: FollowRepository,
    private readonly metadata: TmdbMetadataService,
    private readonly acquisition: AcquisitionService,
  ) {}

  async isFollowing(userId: string, targetType: FollowTargetType, tmdbId: number) {
    return Boolean(await this.repository.find(userId, targetType, tmdbId));
  }

  async follow(userId: string, targetType: FollowTargetType, tmdbId: number, locale: string) {
    if (targetType === "person") {
      const person = await this.metadata.getPersonMetadata(tmdbId, locale);
      return this.repository.create({
        userId,
        targetType,
        tmdbId,
        locale,
        title: person.name,
        imagePath: person.profilePath,
        snapshot: { creditKeys: person.credits.map(creditKey) },
      });
    }
    const title = await this.metadata.getTitle(userId, targetType, tmdbId, locale);
    const providerState = await this.acquisition.getState(targetType, tmdbId).catch(() => "unavailable" as const);
    return this.repository.create({
      userId,
      targetType,
      tmdbId,
      locale,
      title: title.title,
      imagePath: title.posterPath,
      releaseDate: title.nextAirDate ?? title.date,
      snapshot: { seasonCount: title.seasons },
      requestState: title.available ? "available" : normalizeRequestState(providerState),
    });
  }

  unfollow(userId: string, targetType: FollowTargetType, tmdbId: number) {
    return this.repository.remove(userId, targetType, tmdbId);
  }
  list(userId: string) {
    return this.repository.list(userId);
  }
  listEvents(userId: string) {
    return this.repository.listEvents(userId);
  }

  async refreshUser(userId: string, locale: string) {
    const followed = await this.repository.list(userId);
    for (const follow of followed) await this.refreshFollow(follow, locale);
    return followed.length;
  }

  async refreshDue() {
    const due = await this.repository.getDue(new Date(Date.now() - 24 * 60 * 60 * 1_000));
    for (const { follow } of due) await this.refreshFollow(follow, follow.locale);
    return due.length;
  }

  private async refreshFollow(follow: Awaited<ReturnType<FollowRepository["list"]>>[number], locale: string) {
    const targetType = follow.targetType as FollowTargetType;
    if (targetType === "person") {
      const person = await this.metadata.getPersonMetadata(follow.tmdbId, locale, true);
      const previous = new Set(follow.snapshot.creditKeys ?? []);
      const checkedDate = follow.lastCheckedAt?.toISOString().slice(0, 10);
      for (const credit of person.credits.filter(
        (item) => !previous.has(creditKey(item)) && (!checkedDate || !item.date || item.date >= checkedDate),
      )) {
        await this.repository.addEvent({
          followId: follow.id,
          userId: follow.userId,
          eventKey: `${follow.id}:credit:${credit.type}:${credit.id}`,
          eventType: "new_credit",
          relatedType: credit.type,
          relatedTmdbId: credit.id,
          relatedTitle: credit.title,
          detail: { role: credit.role, date: credit.date },
        });
      }
      await this.repository.update(follow.id, {
        title: person.name,
        imagePath: person.profilePath,
        snapshot: { creditKeys: person.credits.map(creditKey) },
      });
      return;
    }

    const title = await this.metadata.refreshTitleMetadata(targetType, follow.tmdbId, locale);
    const fullTitle = await this.metadata.getTitle(follow.userId, targetType, follow.tmdbId, locale);
    const providerState = await this.acquisition
      .getState(targetType, follow.tmdbId)
      .catch(() => "unavailable" as const);
    const requestState = fullTitle.available ? "available" : normalizeRequestState(providerState);
    if (
      targetType === "series" &&
      title.seasons !== undefined &&
      title.seasons > (follow.snapshot.seasonCount ?? title.seasons)
    ) {
      await this.repository.addEvent({
        followId: follow.id,
        userId: follow.userId,
        eventKey: `${follow.id}:season:${title.seasons}`,
        eventType: "new_season",
        relatedType: "series",
        relatedTmdbId: title.id,
        relatedTitle: title.title,
        detail: { previous: follow.snapshot.seasonCount, current: title.seasons },
      });
    }
    const upcomingDate = title.nextAirDate ?? title.date;
    if (upcomingDate && upcomingDate !== follow.releaseDate) {
      await this.repository.addEvent({
        followId: follow.id,
        userId: follow.userId,
        eventKey: `${follow.id}:release-date:${upcomingDate}`,
        eventType: "release_date",
        relatedType: targetType,
        relatedTmdbId: title.id,
        relatedTitle: title.title,
        detail: { previous: follow.releaseDate, current: upcomingDate },
      });
    }
    const checkedDate = follow.lastCheckedAt?.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (upcomingDate && checkedDate && upcomingDate > checkedDate && upcomingDate <= today) {
      await this.repository.addEvent({
        followId: follow.id,
        userId: follow.userId,
        eventKey: `${follow.id}:released:${upcomingDate}`,
        eventType: "released",
        relatedType: targetType,
        relatedTmdbId: title.id,
        relatedTitle: title.title,
        detail: { date: upcomingDate },
      });
    }
    if (requestState === "requestable" && follow.requestState !== "requestable") {
      await this.repository.addEvent({
        followId: follow.id,
        userId: follow.userId,
        eventKey: `${follow.id}:requestable:${new Date().toISOString().slice(0, 10)}`,
        eventType: "requestable",
        relatedType: targetType,
        relatedTmdbId: title.id,
        relatedTitle: title.title,
      });
    }
    await this.repository.update(follow.id, {
      title: title.title,
      imagePath: title.posterPath,
      releaseDate: upcomingDate,
      snapshot: { seasonCount: title.seasons },
      requestState,
    });
  }
}

function creditKey(credit: { type: string; id: number }) {
  return `${credit.type}:${credit.id}`;
}
function normalizeRequestState(state: string) {
  return state === "pending"
    ? "pending"
    : state === "existing"
      ? "existing"
      : state === "requestable"
        ? "requestable"
        : "unavailable";
}
