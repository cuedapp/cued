import { describe, expect, it, vi } from "vitest";
import { OpenRouterClient, OpenRouterRequestError } from "@/server/integrations/ai/openrouter-client";

function response(output: unknown, status = 200) {
  return new Response(JSON.stringify(output), { status, headers: { "Content-Type": "application/json" } });
}

describe("OpenRouterClient", () => {
  it("requires private routing and strict structured output", async () => {
    const payload = { summary: "Likes grounded mysteries.", traits: ["grounded mystery"], dislikes: [] };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify(payload) } }] }));

    await expect(new OpenRouterClient(transport).generateTasteProfile("secret-key", "z-ai/glm-5.3-flash", "en", [])).resolves.toEqual(payload);

    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret-key");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "z-ai/glm-5.3-flash",
      provider: { zdr: true, data_collection: "deny", require_parameters: true },
      reasoning: { effort: "low" },
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
  });

  it("does not weaken routing requirements for free models", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: '{"ready":true}' } }] }));
    await new OpenRouterClient(transport).testConnection("secret-key", "openrouter/free");
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toMatchObject({
      model: "openrouter/free",
      provider: { zdr: true, data_collection: "deny", require_parameters: true },
    });
  });

  it("redacts keys from provider errors", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { message: "Invalid secret-key" } }, 400));
    await expect(new OpenRouterClient(transport).testConnection("secret-key", "z-ai/glm-5.3-flash")).rejects.toEqual(expect.objectContaining<OpenRouterRequestError>({
      name: "OpenRouterRequestError",
      status: 400,
      message: "Invalid [redacted]",
    }));
  });

  it("reports provider-supplied token usage and actual cost", async () => {
    const onUsage = vi.fn();
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: '{"summary":"Profile","traits":[],"dislikes":[]}' } }], usage: { prompt_tokens: 120, completion_tokens: 30, cost: 0.0002 } }));
    await new OpenRouterClient(transport, onUsage).generateTasteProfile("key", "z-ai/glm-5.3-flash", "en", []);
    expect(onUsage).toHaveBeenCalledWith({ model: "z-ai/glm-5.3-flash", inputTokens: 120, outputTokens: 30, costUsd: 0.0002 });
  });
});
