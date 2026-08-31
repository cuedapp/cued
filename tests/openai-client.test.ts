import { describe, expect, it, vi } from "vitest";
import { OpenAiClient, OpenAiRequestError } from "@/server/integrations/ai/openai-client";

function response(output: unknown, status = 200) { return new Response(JSON.stringify(output), { status, headers: { "Content-Type": "application/json" } }); }

describe("OpenAiClient", () => {
  it("uses the Responses API with encrypted-key-compatible bearer authentication and strict structured output", async () => {
    const payload = { summary: "Likes grounded mysteries.", traits: ["grounded mystery"], dislikes: ["slow pacing"] };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }] }));
    const result = await new OpenAiClient(transport).generateTasteProfile("secret-key", "gpt-5-mini", "en", [{ title: "Example", type: "movie", rating: 5, tags: ["smart"], watched: true }]);
    expect(result).toEqual(payload);
    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    expect(String(url)).not.toContain("secret-key");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret-key");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ model: "gpt-5-mini", store: false, text: { format: { type: "json_schema", strict: true } } });
    expect(body.text.format.schema.properties).toMatchObject({
      summary: { maxLength: 500 },
      traits: { maxItems: 10 },
      dislikes: { maxItems: 8 },
    });
  });

  it("returns sanitized provider errors", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { message: "sensitive" } }, 401));
    await expect(new OpenAiClient(transport).testConnection("bad-key", "gpt-5-mini")).rejects.toEqual(expect.objectContaining<OpenAiRequestError>({ name: "OpenAiRequestError", status: 401, message: "OpenAI request failed" }));
  });

  it("returns actionable validation errors without leaking the API key", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { message: "Unsupported parameter for secret-key", code: "unsupported_parameter", param: "reasoning.effort" } }, 400));
    await expect(new OpenAiClient(transport).testConnection("secret-key", "gpt-5.6-luna")).rejects.toEqual(expect.objectContaining<OpenAiRequestError>({
      name: "OpenAiRequestError",
      status: 400,
      message: "Unsupported parameter for [redacted] (unsupported_parameter: reasoning.effort)",
    }));
  });

  it("disables reasoning for GPT-5.6 models to keep recommendation costs predictable", async () => {
    const payload = { summary: "Likes mysteries.", traits: ["mystery"], dislikes: [] };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }] }));
    await new OpenAiClient(transport).generateTasteProfile("secret-key", "gpt-5.6-luna", "en", []);
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toMatchObject({ model: "gpt-5.6-luna", reasoning: { effort: "none" } });
  });

  it("reports token usage with a preset-derived cost", async () => {
    const onUsage = vi.fn();
    const payload = { summary: "Likes mysteries.", traits: [], dislikes: [] };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }], usage: { input_tokens: 1_000, output_tokens: 100 } }));
    await new OpenAiClient(transport, onUsage).generateTasteProfile("key", "gpt-5.6-luna", "en", []);
    expect(onUsage).toHaveBeenCalledWith({ model: "gpt-5.6-luna", inputTokens: 1_000, outputTokens: 100, costUsd: 0.00032 });
  });
});
