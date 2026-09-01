import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";

export const mediaRouter = createRouter({
  seriesCompletion: protectedProcedure
    .input(z.object({ jellyfinSeriesId: z.string().min(1) }))
    .query(({ ctx, input }) => ctx.services.seriesProgress.getCompletion(ctx.user.id, input.jellyfinSeriesId)),
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), locale: z.string(), page: z.number().int().positive().optional() }))
    .query(({ ctx, input }) => ctx.services.tmdbMetadata.search(ctx.user.id, input.query, input.locale, input.page)),
  title: protectedProcedure
    .input(z.object({ type: z.enum(["movie", "series"]), id: z.number().int().positive(), locale: z.string() }))
    .query(({ ctx, input }) => ctx.services.tmdbMetadata.getTitle(ctx.user.id, input.type, input.id, input.locale)),
  person: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), locale: z.string() }))
    .query(({ ctx, input }) => ctx.services.tmdbMetadata.getPerson(ctx.user.id, input.id, input.locale)),
});
