# Cued Architecture

This document describes only the architecture implemented in Milestone 1. Future direction belongs in [PRODUCT.md](PRODUCT.md) and [ROADMAP.md](ROADMAP.md).

## Runtime topology

Cued runs as two containers:

1. A single Next.js application process serves the React UI, route handlers and tRPC API.
2. PostgreSQL stores durable application data in a named Docker volume.

The application container waits for the PostgreSQL health check. Its entrypoint then runs committed Drizzle migrations synchronously. The web server starts only after migration success. There is no Redis, message broker, separate worker, authentication system, or external service integration.

## Source boundaries

```text
src/
├── app/                    Next.js routes, layouts, health and tRPC adapters
├── components/             React UI and shadcn/ui primitives
├── i18n/                   Locale routing and request configuration
├── lib/                    Cross-cutting client/server utilities
└── server/
    ├── api/                tRPC transport, context and routers
    ├── application/        Application services and use-case behavior
    ├── db/                 Drizzle client and schema
    ├── integrations/       Reserved boundary; no providers implemented
    └── jobs/               In-process job contracts and runner
messages/                   Contributor-friendly JSON translations
drizzle/                    Ordered, committed SQL migrations
scripts/                    Runtime migration/entrypoint scripts
tests/                      Foundation unit and integration tests
```

Imports use the `@/` alias rooted at `src`. These boundaries are directories inside one application rather than separate packages. That keeps the current repository simple while making later extraction into workspace packages mechanical if scale warrants it.

pnpm is pinned through the `packageManager` field and uses a committed frozen lockfile. A minimal workspace definition keeps the repository ready for later package extraction without changing its current single-application structure. Direct dependency versions are exact; upgrades should be explicit and reviewed.

## Request paths

### Page rendering

`next-intl` middleware assigns an explicit `/en`, `/sv`, or `/nl` locale. The locale layout loads the matching JSON messages and wraps the responsive application shell with theme, translation, TanStack Query and tRPC providers.

### tRPC proof flow

The dashboard's `SystemStatus` client component calls `system.info` through tRPC. The router delegates to `AppInfoService` supplied by the request context and returns its typed result. Application behavior therefore lives outside the transport router:

```text
React SystemStatus → tRPC system.info → AppInfoService → typed response
```

### Health

`GET /api/health` invokes `HealthService`, whose database probe executes `select 1`. A healthy app and database produce HTTP 200. A failed database probe produces HTTP 503 with a structured, non-secret response and a JSON error log on stderr.

## Database and migrations

Drizzle defines the schema in TypeScript. The initial migration adds `job_runs`, the persistence seam for future background work. Migration SQL is committed and is applied with Drizzle's migrator by `scripts/migrate.mjs`.

The database client uses a development-safe global connection reuse pattern to avoid creating extra pools during Next.js hot reloads. Production uses a bounded `postgres` connection pool.

## Background jobs

`InProcessJobRunner` executes a `Job` in the application process, prevents concurrent execution of the same named job, returns an explicit execution result, and emits structured logs. No jobs are scheduled in Milestone 1 because there is no genuine background workload yet. This deliberately avoids introducing a queue or worker before one is needed.

In-process execution does not provide distributed locking or delivery guarantees. Those constraints must be revisited before horizontal scaling or critical recurring work is added.

## Configuration and logging

`src/env.ts` validates the complete bootstrap environment with Zod at startup. Only the database URL, log level and standard Node runtime mode are accepted. Future integration credentials are outside this configuration contract.

The lightweight logger writes one JSON object per line to stdout for debug/info and stderr for warn/error. Fields are structured for container log collection, and secrets must never be included.

## UI foundations

The App Router shell is responsive, server-rendered and intentionally contains no fabricated media. Tailwind CSS supplies styling; local shadcn/ui-compatible primitives provide the component foundation. `next-themes` supports light, dark and operating-system modes. Locale navigation preserves the current page.

PWA installability is established through a web app manifest, standalone display mode, theme colors and 192/512 icons. Offline caching and push notifications are not implemented.

## Testing and delivery

Vitest covers environment validation, application-service behavior, healthy/degraded database probing, and the tRPC-to-service boundary. GitHub Actions runs installation, lint, strict TypeScript checks, tests and a production build in order.

The production Docker image uses Next.js standalone output, runs as an unprivileged user, includes container health checks and receives termination signals directly through `exec`.
