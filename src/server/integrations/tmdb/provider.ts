export type TmdbMediaType = "movie" | "series";

export interface TmdbSearchResult {
  id: number;
  type: TmdbMediaType | "person";
  title: string;
  originalTitle?: string;
  overview?: string;
  date?: string;
  imagePath?: string;
  popularity: number;
  department?: string;
}

export interface TmdbSearchPage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: TmdbSearchResult[];
}

export interface TmdbCandidate {
  id: number;
  type: TmdbMediaType;
  title: string;
  overview: string;
  date?: string;
  posterPath?: string;
  genreIds: number[];
  rating: number;
  voteCount: number;
  popularity: number;
}

export interface TmdbCandidatePage {
  page: number;
  totalPages: number;
  results: TmdbCandidate[];
}

export interface TmdbCredit {
  id: number;
  name: string;
  role: string;
  profilePath?: string;
}

export interface TmdbVideo {
  id: string;
  name: string;
  site: string;
  key: string;
  type: string;
  official: boolean;
}

export interface TmdbTitleDetails {
  id: number;
  type: TmdbMediaType;
  title: string;
  originalTitle: string;
  overview: string;
  tagline?: string;
  date?: string;
  posterPath?: string;
  backdropPath?: string;
  runtimeMinutes?: number;
  genres: Array<{ id: number; name: string }>;
  rating: number;
  voteCount?: number;
  status?: string;
  imdbId?: string;
  seasons?: number;
  episodes?: number;
  nextAirDate?: string;
  cast: TmdbCredit[];
  crew: TmdbCredit[];
  videos: TmdbVideo[];
}

export interface TmdbPersonCredit {
  id: number;
  type: TmdbMediaType;
  title: string;
  role: string;
  date?: string;
  posterPath?: string;
  popularity?: number;
  rating?: number;
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  profilePath?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  department?: string;
  credits: TmdbPersonCredit[];
}

export interface TmdbConfiguration {
  imageSecureBaseUrl: string;
}

export interface TmdbProvider {
  getConfiguration(accessToken: string): Promise<TmdbConfiguration>;
  search(accessToken: string, query: string, language: string, page?: number): Promise<TmdbSearchPage>;
  getTitle(accessToken: string, type: TmdbMediaType, id: number, language: string): Promise<TmdbTitleDetails>;
  getPerson(accessToken: string, id: number, language: string): Promise<TmdbPersonDetails>;
  discover(
    accessToken: string,
    type: TmdbMediaType,
    genreIds: number[],
    language: string,
    page?: number,
  ): Promise<TmdbCandidatePage>;
  getRecommendations(
    accessToken: string,
    type: TmdbMediaType,
    id: number,
    language: string,
    page?: number,
  ): Promise<TmdbCandidatePage>;
}
