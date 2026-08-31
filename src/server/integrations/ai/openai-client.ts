import { z } from "zod";
import type { AiCandidate, AiProvider, AiRerankedCandidate, AiTasteSignal, AiUsage, TasteProfile } from "./provider";

const baseUrl = "https://api.openai.com/v1";
const profileSchema = z.object({ summary: z.string().min(1).max(500), traits: z.array(z.string().min(1).max(80)).max(10), dislikes: z.array(z.string().min(1).max(80)).max(8) });
const rerankSchema = z.object({ recommendations: z.array(z.object({ id: z.number().int().positive(), type: z.enum(["movie", "series"]), score: z.number().min(0).max(100), explanation: z.string().min(1).max(180) })).max(20) });
const responseSchema = z.object({ output: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional() }).loose()).optional() }).loose()), usage: z.object({ input_tokens: z.number().nonnegative(), output_tokens: z.number().nonnegative() }).optional() }).loose();
const errorResponseSchema = z.object({ error: z.object({ code: z.string().nullable().optional(), param: z.string().nullable().optional(), message: z.string().optional() }).loose() }).loose();

export class OpenAiRequestError extends Error {
  constructor(public readonly status: number, message = "OpenAI request failed") { super(message); this.name = "OpenAiRequestError"; }
}

export class OpenAiClient implements AiProvider {
  constructor(private readonly transport: typeof fetch = fetch, private readonly onUsage?: (usage: AiUsage) => Promise<void> | void) {}

  async testConnection(apiKey: string, model: string) {
    await this.request(`/models/${encodeURIComponent(model)}`, apiKey, { method: "GET" });
  }

  async generateTasteProfile(apiKey: string, model: string, locale: string, signals: AiTasteSignal[]): Promise<TasteProfile> {
    return this.parseStructured(profileSchema, await this.structured(apiKey, model, "cued_taste_profile", {
      type: "object", additionalProperties: false,
      properties: { summary: { type: "string", minLength: 1, maxLength: 500 }, traits: { type: "array", maxItems: 10, items: { type: "string", minLength: 1, maxLength: 80 } }, dislikes: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 80 } } },
      required: ["summary", "traits", "dislikes"],
    }, `Create a concise, nuanced media taste profile in locale ${locale}. Distinguish genuine preferences from mere completion. Never invent viewing facts.\n\nSignals:\n${JSON.stringify(signals)}`));
  }

  async rerank(apiKey: string, model: string, locale: string, profile: TasteProfile, candidates: AiCandidate[]): Promise<AiRerankedCandidate[]> {
    const result = this.parseStructured(rerankSchema, await this.structured(apiKey, model, "cued_recommendation_rerank", {
      type: "object", additionalProperties: false,
      properties: {
        recommendations: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { id: { type: "integer", minimum: 1 }, type: { type: "string", enum: ["movie", "series"] }, score: { type: "number", minimum: 0, maximum: 100 }, explanation: { type: "string", minLength: 1, maxLength: 180 } },
            required: ["id", "type", "score", "explanation"],
          },
        },
      },
      required: ["recommendations"],
    }, `Rerank only the supplied candidates for this taste profile. Return every candidate exactly once. Scores must use the full 0–100 scale, where 100 is the strongest possible match; never return a 0–1 fraction. Keep each explanation to one short sentence in locale ${locale}.\n\nProfile:\n${JSON.stringify(profile)}\n\nCandidates:\n${JSON.stringify(candidates)}`));
    return result.recommendations;
  }

  private async structured(apiKey: string, model: string, name: string, schema: Record<string, unknown>, input: string) {
    const reasoning = model.startsWith("gpt-5.6-") ? { effort: "none" } : undefined;
    const raw = await this.request("/responses", apiKey, { method: "POST", body: JSON.stringify({ model, store: false, input, max_output_tokens: 2_000, reasoning, text: { verbosity: "low", format: { type: "json_schema", name, strict: true, schema } } }) });
    const response = responseSchema.parse(raw);
    const text = response.output.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text;
    if (!text) throw new OpenAiRequestError(502, "OpenAI returned no structured output");
    if (response.usage) await this.onUsage?.({ model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, costUsd: estimateOpenAiCost(model, response.usage.input_tokens, response.usage.output_tokens) });
    try { return JSON.parse(text) as unknown; } catch { throw new OpenAiRequestError(502, "OpenAI returned invalid structured output"); }
  }

  private parseStructured<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new OpenAiRequestError(502, "OpenAI returned data in an unexpected format");
    return parsed.data;
  }

  private async request(path: string, apiKey: string, init: RequestInit) {
    let response: Response;
    try { response = await this.transport(`${baseUrl}${path}`, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(30_000) }); }
    catch { throw new OpenAiRequestError(0, "OpenAI could not be reached"); }
    if (!response.ok) {
      let message = "OpenAI request failed";
      if (response.status !== 401 && response.status !== 403) {
        const parsed = errorResponseSchema.safeParse(await response.json().catch(() => undefined));
        if (parsed.success) {
          const details = [parsed.data.error.code, parsed.data.error.param].filter(Boolean).join(": ");
          const providerMessage = parsed.data.error.message?.replaceAll(apiKey, "[redacted]").slice(0, 300);
          message = [providerMessage, details && `(${details})`].filter(Boolean).join(" ") || message;
        }
      }
      throw new OpenAiRequestError(response.status, message);
    }
    return response.json();
  }
}

function estimateOpenAiCost(model: string, inputTokens: number, outputTokens: number) {
  const prices: Record<string, [number, number]> = { "gpt-5.6-luna": [0.2, 1.2], "gpt-5-nano": [0.05, 0.4], "gpt-4o-mini": [0.15, 0.6], "gpt-5-mini": [0.25, 2] };
  const price = prices[model];
  return price ? (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 : undefined;
}
