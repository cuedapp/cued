import type { CollectionRepository } from "@/server/db/repositories/collection.repository";

export class CollectionService {
  constructor(private readonly repository: CollectionRepository) {}

  listForUser(userId: string) {
    return this.repository.listForUser(userId);
  }

  getForUser(userId: string, collectionId: string) {
    return this.repository.getForUser(userId, collectionId);
  }

  getByTmdbIdForUser(userId: string, tmdbId: number) {
    return this.repository.getByTmdbIdForUser(userId, tmdbId);
  }
}
