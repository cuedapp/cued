import { createRouter } from "./trpc";
import { systemRouter } from "./routers/system";

export const appRouter = createRouter({ system: systemRouter });
export type AppRouter = typeof appRouter;
