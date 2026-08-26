import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";

export const mediaRouter = createRouter({
  seriesCompletion: protectedProcedure.input(z.object({ jellyfinSeriesId: z.string().min(1) })).query(({ ctx, input }) => ctx.services.seriesProgress.getCompletion(ctx.user.id, input.jellyfinSeriesId)),
});
