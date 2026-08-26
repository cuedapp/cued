import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createRouter } from "../trpc";

export const integrationsRouter = createRouter({
  jellyfin: adminProcedure.query(({ ctx }) => ctx.services.jellyfinIntegration.getOverview()),
  configureJellyfin: adminProcedure.input(z.object({ baseUrl: z.string().url(), apiKey: z.string().optional() })).mutation(({ ctx, input }) => ctx.services.jellyfinIntegration.configure(input)),
  testJellyfin: adminProcedure.mutation(({ ctx }) => ctx.services.jellyfinIntegration.testConnection()),
  selectJellyfinLibraries: adminProcedure.input(z.object({ libraryIds: z.array(z.string()) })).mutation(({ ctx, input }) => ctx.services.jellyfinIntegration.selectLibraries(input.libraryIds)),
  syncJellyfin: adminProcedure.input(z.object({ mode: z.enum(["full", "updates"]) }).optional()).mutation(({ ctx, input }) => {
    if (!ctx.services.mediaSync) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Secret encryption is not configured" });
    return ctx.services.mediaSync.sync("manual", ctx.user.id, input?.mode ?? "updates");
  }),
  tmdb: adminProcedure.query(({ ctx }) => ctx.services.tmdbIntegration.getOverview()),
  configureTmdb: adminProcedure.input(z.object({ accessToken: z.string().optional() })).mutation(({ ctx, input }) => ctx.services.tmdbIntegration.configure(input.accessToken)),
  testTmdb: adminProcedure.mutation(({ ctx }) => ctx.services.tmdbIntegration.testConnection()),
});
