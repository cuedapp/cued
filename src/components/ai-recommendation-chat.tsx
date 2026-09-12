"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/button";

type Result = {
  answer: string;
  remaining: number;
  recommendations: Array<{
    id: string;
    tmdbId: number;
    mediaType: string;
    title: string;
    posterPath: string | null;
    explanation: string;
  }>;
};

export function AiRecommendationChat({ initialRemaining }: { initialRemaining: number }) {
  const t = useTranslations("AiChat");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Result>();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, question }),
      });
      const body = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "failed");
      setResult(body);
      setRemaining(body.remaining);
    } catch (cause) {
      setError(t(`errors.${cause instanceof Error ? cause.message : "failed"}` as never));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <label htmlFor="ai-question" className="font-semibold">
          {t("questionLabel")}
        </label>
        <textarea
          id="ai-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder={t("placeholder")}
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{t("remaining", { count: remaining })}</span>
          <Button type="submit" disabled={loading || question.trim().length < 3 || remaining < 1}>
            <Send className="size-4" />
            {loading ? t("thinking") : t("ask")}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>
      {result && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
            <Sparkles className="size-5 text-primary" />
            <p className="mt-3 leading-7">{result.answer}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.recommendations.map((item) => (
              <Link
                key={`${item.mediaType}:${item.tmdbId}`}
                href={`/title/${item.mediaType}/${item.tmdbId}` as never}
                className="rounded-2xl border border-border bg-card p-4 outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
