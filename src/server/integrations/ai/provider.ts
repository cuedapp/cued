export type AiMode = "off" | "conservative" | "balanced" | "enhanced";
export type AiProviderId = "openai" | "openrouter";
export type AiUsage = { model: string; inputTokens: number; outputTokens: number; costUsd?: number };

export interface TasteProfile {
  summary: string;
  traits: string[];
  dislikes: string[];
}

export interface AiTasteSignal {
  title: string;
  type: "movie" | "series";
  rating: number | null;
  tags: string[];
  feedback?: string;
  watched: boolean;
}

export interface AiCandidate {
  id: number;
  type: "movie" | "series";
  title: string;
  overview: string;
  genres: string[];
  deterministicMatch: number;
}

export interface AiRerankedCandidate {
  id: number;
  type: "movie" | "series";
  score: number;
  explanation: string;
}

export interface AiProvider {
  testConnection(apiKey: string, model: string): Promise<void>;
  generateTasteProfile(apiKey: string, model: string, locale: string, signals: AiTasteSignal[]): Promise<TasteProfile>;
  rerank(
    apiKey: string,
    model: string,
    locale: string,
    profile: TasteProfile,
    candidates: AiCandidate[],
  ): Promise<AiRerankedCandidate[]>;
}
