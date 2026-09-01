import { z } from "zod";
import type { AiCandidate, AiProvider, AiRerankedCandidate, AiTasteSignal, AiUsage, TasteProfile } from "./provider";

const baseUrl = "https://openrouter.ai/api/v1";
const profileSchema = z.object({
  summary: z.string().min(1).max(500),
  traits: z.array(z.string().min(1).max(80)).max(10),
  dislikes: z.array(z.string().min(1).max(80)).max(8),
});
const rerankSchema = z.object({
  recommendations: z
    .array(
      z.object({
        id: z.number().int().positive(),
        type: z.enum(["movie", "series"]),
        score: z.number().min(0).max(100),
        explanation: z.string().min(1).max(180),
      }),
    )
    .max(20),
});
const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional() }) })).min(1),
  usage: z
    .object({
      prompt_tokens: z.number().nonnegative(),
      completion_tokens: z.number().nonnegative(),
      cost: z.number().nonnegative().optional(),
    })
    .optional(),
});
const errorSchema = z.object({ error: z.object({ message: z.string().optional() }).optional() });

export class OpenRouterRequestError extends Error {
  constructor(
    public readonly status: number,
    message = "OpenRouter request failed",
  ) {
    super(message);
    this.name = "OpenRouterRequestError";
  }
}

export class OpenRouterClient implements AiProvider {
  constructor(
    private readonly transport: typeof fetch = fetch,
    private readonly onUsage?: (usage: AiUsage) => Promise<void> | void,
  ) {}

  async testConnection(apiKey: string, model: string) {
    await this.structured(
      apiKey,
      model,
      "cued_connection_test",
      { type: "object", additionalProperties: false, properties: { ready: { type: "boolean" } }, required: ["ready"] },
      'Return {"ready": true}.',
      false,
    );
  }

  async generateTasteProfile(
    apiKey: string,
    model: string,
    locale: string,
    signals: AiTasteSignal[],
  ): Promise<TasteProfile> {
    return this.parse(
      profileSchema,
      await this.structured(
        apiKey,
        model,
        "cued_taste_profile",
        {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string", minLength: 1, maxLength: 500 },
            traits: { type: "array", maxItems: 10, items: { type: "string", minLength: 1, maxLength: 80 } },
            dislikes: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 80 } },
          },
          required: ["summary", "traits", "dislikes"],
        },
        `Create a concise media taste profile in locale ${locale}. Never invent viewing facts.\n\nSignals:\n${JSON.stringify(signals)}`,
      ),
    );
  }

  async rerank(
    apiKey: string,
    model: string,
    locale: string,
    profile: TasteProfile,
    candidates: AiCandidate[],
  ): Promise<AiRerankedCandidate[]> {
    const result = this.parse(
      rerankSchema,
      await this.structured(
        apiKey,
        model,
        "cued_recommendation_rerank",
        {
          type: "object",
          additionalProperties: false,
          properties: {
            recommendations: {
              type: "array",
              maxItems: 20,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "integer", minimum: 1 },
                  type: { type: "string", enum: ["movie", "series"] },
                  score: { type: "number", minimum: 0, maximum: 100 },
                  explanation: { type: "string", minLength: 1, maxLength: 180 },
                },
                required: ["id", "type", "score", "explanation"],
              },
            },
          },
          required: ["recommendations"],
        },
        `Rerank only the supplied candidates. Return every candidate exactly once. Scores use 0–100. Keep each explanation to one short sentence in locale ${locale}.\n\nProfile:\n${JSON.stringify(profile)}\n\nCandidates:\n${JSON.stringify(candidates)}`,
      ),
    );
    return result.recommendations;
  }

  private async structured(
    apiKey: string,
    model: string,
    name: string,
    schema: Record<string, unknown>,
    prompt: string,
    trackUsage = true,
  ) {
    const response = await this.request(apiKey, {
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
      provider: { zdr: true, data_collection: "deny", require_parameters: true },
      ...(model === "z-ai/glm-5.3-flash" ? { reasoning: { effort: "low" } } : {}),
      temperature: 0,
    });
    const parsedResponse = responseSchema.parse(response);
    const content = parsedResponse.choices[0]?.message.content;
    if (!content) throw new OpenRouterRequestError(502, "OpenRouter returned no structured output");
    if (trackUsage && parsedResponse.usage)
      await this.onUsage?.({
        model,
        inputTokens: parsedResponse.usage.prompt_tokens,
        outputTokens: parsedResponse.usage.completion_tokens,
        ...(parsedResponse.usage.cost !== undefined ? { costUsd: parsedResponse.usage.cost } : {}),
      });
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new OpenRouterRequestError(502, "OpenRouter returned invalid structured output");
    }
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new OpenRouterRequestError(502, "OpenRouter returned data in an unexpected format");
    return parsed.data;
  }

  private async request(apiKey: string, body: Record<string, unknown>) {
    let response: Response;
    try {
      response = await this.transport(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new OpenRouterRequestError(0, "OpenRouter could not be reached");
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => undefined));
      const message =
        response.status === 401 || response.status === 403
          ? "OpenRouter authentication failed"
          : parsed.success
            ? parsed.data.error?.message?.replaceAll(apiKey, "[redacted]").slice(0, 300) || "OpenRouter request failed"
            : "OpenRouter request failed";
      throw new OpenRouterRequestError(response.status, message);
    }
    return response.json();
  }
}
