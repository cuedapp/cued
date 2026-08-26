import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc";

export const systemRouter = createRouter({
  info: publicProcedure.input(z.void()).query(({ ctx }) => ctx.services.appInfo.getInfo()),
});
