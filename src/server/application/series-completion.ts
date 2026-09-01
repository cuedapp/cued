export interface EpisodeCompletionInput {
  premiereDate?: Date;
  played: boolean;
}

export function calculateSeriesCompletion(episodes: EpisodeCompletionInput[], now = new Date()) {
  const released = episodes.filter((episode) => !episode.premiereDate || episode.premiereDate <= now);
  const played = released.filter((episode) => episode.played).length;
  return {
    played,
    released: released.length,
    percentage: released.length === 0 ? 0 : Math.round((played / released.length) * 100),
  };
}
