import { createRouter } from "./trpc";
import { systemRouter } from "./routers/system";
import { integrationsRouter } from "./routers/integrations";
import { mediaRouter } from "./routers/media";

export const appRouter = createRouter({ system: systemRouter, integrations: integrationsRouter, media: mediaRouter });
export type AppRouter = typeof appRouter;
