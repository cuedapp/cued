"use client";

import { useState } from "react";
import { Clock3, Send, Sparkles, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { MediaCard } from "./media-card";
import { MediaGrid } from "./media-grid";
import { MediaCapabilityBadges } from "./media-capability-badges";
import { PosterBadge } from "./poster-badge";
import { WatchedBadge } from "./watched-badge";
import { SegmentedControl } from "./ui/segmented-control";

type Result = {
  id: string;
  question: string;
  scope: "catalogue" | "explore";
  answer: string;
  remaining: number;
  createdAt: string;
  recommendations: Array<{
    id: string;
    tmdbId: number;
    mediaType: string;
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
    rating: number;
    contentRatingAge?: number | null;
    available: boolean;
    watched?: boolean;
    partiallyWatched?: boolean;
    strmAvailable: boolean;
    strmPending: boolean;
    m3uAvailable: boolean;
    explanation: string;
  }>;
};

type Conversation = Omit<Result, "remaining">;

export function AiRecommendationChat({
  initialRemaining,
  initialHistory,
}: {
  initialRemaining: number;
  initialHistory: Conversation[];
}) {
  const t = useTranslations("AiChat");
  const mediaT = useTranslations("Search");
  const recommendationT = useTranslations("RecommendationCard");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<"catalogue" | "explore">(initialHistory[0]?.scope ?? "catalogue");
  const [result, setResult] = useState<Result>();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [history, setHistory] = useState(initialHistory);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const submittedQuestion = question;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, question: submittedQuestion, scope }),
      });
      const body = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "failed");
      setResult(body);
      setQuestion("");
      setHistory((current) => [body, ...current.filter((item) => item.id !== body.id)]);
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
        <label htmlFor="ai-question" className="block text-lg font-semibold">
          {t("questionLabel")}
        </label>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`scopeHelp.${scope}`)}</p>
        <SegmentedControl
          value={scope}
          onValueChange={setScope}
          label={t("scopeLabel")}
          className="mt-4 mb-5 max-w-full flex-col items-stretch sm:flex-row"
          options={[
            { value: "catalogue", label: t("scopes.catalogue") },
            { value: "explore", label: t("scopes.explore") },
          ]}
        />
        <textarea
          id="ai-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder={t(`placeholders.${scope}`)}
          className="w-full resize-y rounded-xl border border-border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="flex items-center justify-between gap-3">
              <Sparkles className="size-5 text-primary" />
              <span className="rounded-full border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                {t(`scopeBadges.${result.scope}`)}
              </span>
            </div>
            <p className="mt-3 leading-7">{renderSimpleMarkdown(result.answer)}</p>
          </div>
          <MediaGrid>
            {result.recommendations.map((item) => (
              <MediaCard
                key={`${item.mediaType}:${item.tmdbId}`}
                href={`/title/${item.mediaType}/${item.tmdbId}` as never}
                posterPath={item.posterPath}
                title={item.title}
                secondary={item.explanation}
                contentRatingAge={item.contentRatingAge}
                meta={item.releaseDate?.slice(0, 4) ?? mediaT(`types.${item.mediaType}` as never)}
                topLeft={
                  item.rating > 0 ? (
                    <PosterBadge>
                      <Star className="size-3 fill-current text-primary" />
                      {item.rating.toFixed(1)}
                    </PosterBadge>
                  ) : undefined
                }
                badges={
                  <>
                    {item.watched && <WatchedBadge label={recommendationT("watched")} />}
                    {item.partiallyWatched && (
                      <WatchedBadge state="partial" label={recommendationT("partiallyWatched")} />
                    )}
                    <MediaCapabilityBadges
                      available={item.available}
                      strmAvailable={item.strmAvailable}
                      strmPending={item.strmPending}
                      strmRequestable={item.m3uAvailable}
                      availableLabel={mediaT("available")}
                      strmAvailableLabel={mediaT("strmAvailable")}
                      strmPendingLabel={mediaT("strmPending")}
                      strmRequestableLabel={mediaT("strmRequestable")}
                    />
                  </>
                }
              />
            ))}
          </MediaGrid>
        </section>
      )}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">{t("historyTitle")}</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {history.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setResult({ ...conversation, remaining })}
                className="flex w-full items-center gap-3 p-4 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted"
              >
                <Clock3 className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium">{conversation.question}</span>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(conversation.createdAt))}
                </time>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function renderSimpleMarkdown(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}
