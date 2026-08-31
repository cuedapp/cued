import { describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/ai-recommendation-evaluation.json";
import { OpenAiClient } from "@/server/integrations/ai/openai-client";
import { OpenRouterClient } from "@/server/integrations/ai/openrouter-client";
import type { AiCandidate, AiTasteSignal, TasteProfile } from "@/server/integrations/ai/provider";

const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });

describe.each([
  ["OpenAI", (outputs: unknown[]) => new OpenAiClient(vi.fn<typeof fetch>().mockImplementation(async () => json({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(outputs.shift()) }] }] })))],
  ["OpenRouter", (outputs: unknown[]) => new OpenRouterClient(vi.fn<typeof fetch>().mockImplementation(async () => json({ choices: [{ message: { content: JSON.stringify(outputs.shift()) } }] })))],
])("provider-independent AI evaluation fixture: %s", (_name, createProvider) => {
  it("produces the same validated profile and reranking contract", async () => {
    const provider = createProvider([fixture.profile, { recommendations: fixture.reranked }]);
    const profile = await provider.generateTasteProfile("key", "model", "en", fixture.signals as AiTasteSignal[]);
    const reranked = await provider.rerank("key", "model", "en", profile as TasteProfile, fixture.candidates as AiCandidate[]);
    expect(profile).toEqual(fixture.profile);
    expect(reranked).toEqual(fixture.reranked);
    expect(new Set(reranked.map((item) => `${item.type}:${item.id}`))).toEqual(new Set(fixture.candidates.map((item) => `${item.type}:${item.id}`)));
  });
});
