export type UpcomingTitle = {
  id: number;
  type: "movie" | "series";
  title: string;
  imagePath?: string | null;
  date: string;
  sources: string[];
  sourceFollowIds: string[];
  directlyFollowed: boolean;
};

export function mergeUpcomingTitles(items: UpcomingTitle[]) {
  const byTitle = new Map<string, UpcomingTitle>();
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    const current = byTitle.get(key);
    if (!current) {
      byTitle.set(key, {
        ...item,
        sources: [...new Set(item.sources)],
        sourceFollowIds: [...new Set(item.sourceFollowIds)],
      });
      continue;
    }
    byTitle.set(key, {
      ...current,
      date: item.date < current.date ? item.date : current.date,
      sources: [...new Set([...current.sources, ...item.sources])],
      sourceFollowIds: [...new Set([...current.sourceFollowIds, ...item.sourceFollowIds])],
      directlyFollowed: current.directlyFollowed || item.directlyFollowed,
    });
  }
  return [...byTitle.values()].toSorted((left, right) => left.date.localeCompare(right.date));
}
