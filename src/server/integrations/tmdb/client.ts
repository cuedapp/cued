import { z } from "zod";
import type {
  TmdbCandidatePage,
  TmdbConfiguration,
  TmdbCredit,
  TmdbMediaType,
  TmdbPersonCredit,
  TmdbPersonDetails,
  TmdbProvider,
  TmdbSearchPage,
  TmdbSearchResult,
  TmdbTitleDetails,
} from "./provider";

const tmdbBaseUrl = "https://api.themoviedb.org/3";

const configurationSchema = z.object({ images: z.object({ secure_base_url: z.string().url() }) });

const searchResultSchema = z
  .object({
    id: z.number().int().positive(),
    media_type: z.enum(["movie", "tv", "person"]),
    title: z.string().optional(),
    name: z.string().optional(),
    original_title: z.string().optional(),
    original_name: z.string().optional(),
    overview: z.string().optional(),
    release_date: z.string().optional(),
    first_air_date: z.string().optional(),
    poster_path: z.string().nullish(),
    profile_path: z.string().nullish(),
    popularity: z.number().optional(),
    vote_average: z.number().optional(),
    genre_ids: z.array(z.number().int()).default([]),
    known_for_department: z.string().optional(),
  })
  .loose();

const searchPageSchema = z.object({
  page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
  results: z.array(searchResultSchema),
});

const discoverPageSchema = z.object({
  page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  results: z.array(
    z
      .object({
        id: z.number().int().positive(),
        title: z.string().optional(),
        name: z.string().optional(),
        overview: z.string().default(""),
        release_date: z.string().optional(),
        first_air_date: z.string().optional(),
        poster_path: z.string().nullish(),
        genre_ids: z.array(z.number().int()).default([]),
        vote_average: z.number().default(0),
        vote_count: z.number().int().nonnegative().default(0),
        popularity: z.number().default(0),
      })
      .loose(),
  ),
});

const creditSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    character: z.string().optional(),
    job: z.string().optional(),
    profile_path: z.string().nullish(),
  })
  .loose();

const videoSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    site: z.string(),
    key: z.string(),
    type: z.string(),
    official: z.boolean().optional(),
  })
  .loose();

const titleBaseSchema = z
  .object({
    id: z.number().int().positive(),
    overview: z.string().default(""),
    tagline: z.string().optional(),
    poster_path: z.string().nullish(),
    backdrop_path: z.string().nullish(),
    genres: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
    vote_average: z.number().default(0),
    vote_count: z.number().int().nonnegative().default(0),
    status: z.string().optional(),
    external_ids: z.object({ imdb_id: z.string().nullish() }).optional(),
    credits: z.object({ cast: z.array(creditSchema), crew: z.array(creditSchema) }).optional(),
    videos: z.object({ results: z.array(videoSchema) }).optional(),
  })
  .loose();

const movieDetailsSchema = titleBaseSchema.extend({
  title: z.string().min(1),
  original_title: z.string().min(1),
  release_date: z.string().optional(),
  runtime: z.number().int().nonnegative().nullish(),
});

const seriesDetailsSchema = titleBaseSchema.extend({
  name: z.string().min(1),
  original_name: z.string().min(1),
  first_air_date: z.string().optional(),
  episode_run_time: z.array(z.number().int().nonnegative()).optional(),
  number_of_seasons: z.number().int().nonnegative().optional(),
  number_of_episodes: z.number().int().nonnegative().optional(),
  next_episode_to_air: z.object({ air_date: z.string().nullish() }).nullish(),
});

const personCreditSchema = z
  .object({
    id: z.number().int().positive(),
    media_type: z.enum(["movie", "tv"]),
    title: z.string().optional(),
    name: z.string().optional(),
    character: z.string().optional(),
    job: z.string().optional(),
    release_date: z.string().optional(),
    first_air_date: z.string().optional(),
    poster_path: z.string().nullish(),
    popularity: z.number().optional(),
    vote_average: z.number().optional(),
  })
  .loose();

const personDetailsSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    biography: z.string().default(""),
    profile_path: z.string().nullish(),
    birthday: z.string().nullish(),
    deathday: z.string().nullish(),
    place_of_birth: z.string().nullish(),
    known_for_department: z.string().nullish(),
    combined_credits: z.object({ cast: z.array(personCreditSchema), crew: z.array(personCreditSchema) }).optional(),
  })
  .loose();

export class TmdbRequestError extends Error {
  constructor(
    public readonly status: number,
    message = "TMDB request failed",
  ) {
    super(message);
    this.name = "TmdbRequestError";
  }
}

export class TmdbClient implements TmdbProvider {
  constructor(private readonly transport: typeof fetch = fetch) {}

  async getConfiguration(accessToken: string): Promise<TmdbConfiguration> {
    const result = configurationSchema.parse(await this.request("/configuration", accessToken));
    return { imageSecureBaseUrl: result.images.secure_base_url };
  }

  async search(accessToken: string, query: string, language: string, page = 1): Promise<TmdbSearchPage> {
    const params = new URLSearchParams({ query, language, page: String(page), include_adult: "false" });
    const result = searchPageSchema.parse(await this.request(`/search/multi?${params}`, accessToken));
    return {
      page: result.page,
      totalPages: result.total_pages,
      totalResults: result.total_results,
      results: result.results.flatMap((item): TmdbSearchResult[] => {
        const title = item.title ?? item.name;
        if (!title) return [];
        return [
          {
            id: item.id,
            type: item.media_type === "tv" ? "series" : item.media_type,
            title,
            ...((item.original_title ?? item.original_name)
              ? { originalTitle: item.original_title ?? item.original_name }
              : {}),
            ...(item.overview ? { overview: item.overview } : {}),
            ...((item.release_date ?? item.first_air_date) ? { date: item.release_date ?? item.first_air_date } : {}),
            ...((item.poster_path ?? item.profile_path) ? { imagePath: item.poster_path ?? item.profile_path! } : {}),
            popularity: item.popularity ?? 0,
            ...(item.vote_average !== undefined ? { rating: item.vote_average } : {}),
            genreIds: item.genre_ids,
            ...(item.known_for_department ? { department: item.known_for_department } : {}),
          },
        ];
      }),
    };
  }

  async getTitle(accessToken: string, type: TmdbMediaType, id: number, language: string): Promise<TmdbTitleDetails> {
    const params = new URLSearchParams({
      language,
      append_to_response: "credits,videos,external_ids",
      include_video_language: `${language.split("-")[0]},en,null`,
    });
    const raw = await this.request(`/${type === "series" ? "tv" : "movie"}/${id}?${params}`, accessToken);
    if (type === "movie") {
      const item = movieDetailsSchema.parse(raw);
      return this.mapTitleBase(
        item,
        "movie",
        item.title,
        item.original_title,
        item.release_date,
        item.runtime ?? undefined,
      );
    }
    const item = seriesDetailsSchema.parse(raw);
    return {
      ...this.mapTitleBase(
        item,
        "series",
        item.name,
        item.original_name,
        item.first_air_date,
        item.episode_run_time?.[0],
      ),
      seasons: item.number_of_seasons,
      episodes: item.number_of_episodes,
      ...(item.next_episode_to_air?.air_date ? { nextAirDate: item.next_episode_to_air.air_date } : {}),
    };
  }

  async getPerson(accessToken: string, id: number, language: string): Promise<TmdbPersonDetails> {
    const params = new URLSearchParams({ language, append_to_response: "combined_credits" });
    const person = personDetailsSchema.parse(await this.request(`/person/${id}?${params}`, accessToken));
    const credits = [...(person.combined_credits?.cast ?? []), ...(person.combined_credits?.crew ?? [])]
      .map((credit): TmdbPersonCredit | undefined => {
        const title = credit.title ?? credit.name;
        const role = credit.character ?? credit.job;
        if (!title || !role) return undefined;
        return {
          id: credit.id,
          type: credit.media_type === "tv" ? "series" : "movie",
          title,
          role,
          ...((credit.release_date ?? credit.first_air_date)
            ? { date: credit.release_date ?? credit.first_air_date }
            : {}),
          ...(credit.poster_path ? { posterPath: credit.poster_path } : {}),
          popularity: credit.popularity ?? 0,
          rating: credit.vote_average ?? 0,
        };
      })
      .filter((credit): credit is TmdbPersonCredit => Boolean(credit));
    return {
      id: person.id,
      name: person.name,
      biography: person.biography,
      ...(person.profile_path ? { profilePath: person.profile_path } : {}),
      ...(person.birthday ? { birthday: person.birthday } : {}),
      ...(person.deathday ? { deathday: person.deathday } : {}),
      ...(person.place_of_birth ? { placeOfBirth: person.place_of_birth } : {}),
      ...(person.known_for_department ? { department: person.known_for_department } : {}),
      credits: deduplicateCredits(credits),
    };
  }

  async discover(
    accessToken: string,
    type: TmdbMediaType,
    genreIds: number[],
    language: string,
    page = 1,
  ): Promise<TmdbCandidatePage> {
    const params = new URLSearchParams({
      language,
      page: String(page),
      include_adult: "false",
      include_video: "false",
      sort_by: "vote_average.desc",
      "vote_count.gte": "100",
      ...(genreIds.length > 0 ? { with_genres: genreIds.join("|") } : {}),
    });
    const result = discoverPageSchema.parse(
      await this.request(`/discover/${type === "series" ? "tv" : "movie"}?${params}`, accessToken),
    );
    return this.mapCandidatePage(result, type);
  }

  async getRecommendations(
    accessToken: string,
    type: TmdbMediaType,
    id: number,
    language: string,
    page = 1,
  ): Promise<TmdbCandidatePage> {
    const params = new URLSearchParams({ language, page: String(page) });
    const result = discoverPageSchema.parse(
      await this.request(`/${type === "series" ? "tv" : "movie"}/${id}/recommendations?${params}`, accessToken),
    );
    return this.mapCandidatePage(result, type);
  }

  private mapCandidatePage(result: z.infer<typeof discoverPageSchema>, type: TmdbMediaType): TmdbCandidatePage {
    return {
      page: result.page,
      totalPages: result.total_pages,
      results: result.results.flatMap((item) => {
        const title = item.title ?? item.name;
        if (!title) return [];
        return [
          {
            id: item.id,
            type,
            title,
            overview: item.overview,
            ...((item.release_date ?? item.first_air_date) ? { date: item.release_date ?? item.first_air_date } : {}),
            ...(item.poster_path ? { posterPath: item.poster_path } : {}),
            genreIds: item.genre_ids,
            rating: item.vote_average,
            voteCount: item.vote_count,
            popularity: item.popularity,
          },
        ];
      }),
    };
  }

  private mapTitleBase(
    item: z.infer<typeof titleBaseSchema>,
    type: TmdbMediaType,
    title: string,
    originalTitle: string,
    date?: string,
    runtimeMinutes?: number,
  ): TmdbTitleDetails {
    return {
      id: item.id,
      type,
      title,
      originalTitle,
      overview: item.overview,
      ...(item.tagline ? { tagline: item.tagline } : {}),
      ...(date ? { date } : {}),
      ...(item.poster_path ? { posterPath: item.poster_path } : {}),
      ...(item.backdrop_path ? { backdropPath: item.backdrop_path } : {}),
      ...(runtimeMinutes ? { runtimeMinutes } : {}),
      genres: item.genres,
      rating: item.vote_average,
      voteCount: item.vote_count,
      ...(item.status ? { status: item.status } : {}),
      ...(item.external_ids?.imdb_id ? { imdbId: item.external_ids.imdb_id } : {}),
      cast: (item.credits?.cast ?? []).slice(0, 20).map((credit) => mapCredit(credit, credit.character ?? "")),
      crew: (item.credits?.crew ?? [])
        .filter((credit) => ["Director", "Writer", "Screenplay", "Creator"].includes(credit.job ?? ""))
        .slice(0, 20)
        .map((credit) => mapCredit(credit, credit.job ?? "")),
      videos: (item.videos?.results ?? []).map((video) => ({
        id: video.id,
        name: video.name,
        site: video.site,
        key: video.key,
        type: video.type,
        official: video.official ?? false,
      })),
    };
  }

  private async request(path: string, accessToken: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.transport(`${tmdbBaseUrl}${path}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new TmdbRequestError(0, "TMDB could not be reached");
    }
    if (!response.ok) throw new TmdbRequestError(response.status);
    return response.json();
  }
}

function mapCredit(credit: z.infer<typeof creditSchema>, role: string): TmdbCredit {
  return {
    id: credit.id,
    name: credit.name,
    role,
    ...(credit.profile_path ? { profilePath: credit.profile_path } : {}),
  };
}

function deduplicateCredits(credits: TmdbPersonCredit[]) {
  const byTitle = new Map<string, TmdbPersonCredit>();
  for (const credit of credits) {
    const key = `${credit.type}:${credit.id}`;
    const current = byTitle.get(key);
    if (!current) {
      byTitle.set(key, { ...credit });
      continue;
    }
    const roles = new Set([...current.role.split(" · "), ...credit.role.split(" · ")]);
    byTitle.set(key, { ...current, role: [...roles].join(" · ") });
  }
  return [...byTitle.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function tmdbImageUrl(path: string, size: "w185" | "w342" | "w500" | "w780" | "original" = "w500") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
