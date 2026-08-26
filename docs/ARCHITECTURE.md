# Cued Architecture

This document describes the architecture implemented through Milestone 2. Future direction belongs in [PRODUCT.md](PRODUCT.md) and [ROADMAP.md](ROADMAP.md).

## Runtime topology

Cued runs as a Next.js application container and PostgreSQL. The application serves React Server Components, server actions, route handlers and tRPC from one process. The container waits for PostgreSQL and applies committed Drizzle migrations before starting. There is no Redis, message broker or separate worker.

## Source boundaries

```text
src/
├── app/                    App Router pages, server actions and HTTP adapters
├── components/             React UI and local shadcn/ui-compatible primitives
├── i18n/                   Locale routing and request configuration
├── lib/                    Cross-cutting utilities
└── server/
    ├── api/                tRPC context, authorization and routers
    ├── application/        Authentication, configuration, sync and domain behavior
    ├── auth/               Request/session lookup
    ├── db/                 Drizzle schema, client and repositories
    ├── integrations/       Provider contracts and the Jellyfin implementation
    ├── jobs/               In-process job contracts and runner foundation
    └── security/           Authenticated secret encryption
messages/                   English, Swedish and Dutch messages
drizzle/                    Ordered forward-only SQL migrations
scripts/                    Runtime migration and entrypoint scripts
tests/                      Unit and mocked integration tests
```

Transport code calls application services; provider and persistence behavior remain behind their own boundaries. The Jellyfin client implements a media-server provider contract so later watch-history providers do not need to change application behavior.

## Request and authentication flow

`next-intl` assigns `/en`, `/sv` or `/nl`. The locale layout renders theme and translation providers. Public setup and login pages sit outside the authenticated route group; application pages use a nested server layout that redirects to setup or login before rendering the shell.

Initial setup verifies Jellyfin's public server information and stores its normalized base URL. A user login sends the submitted credentials directly to Jellyfin's authentication endpoint. Cued never persists the password. A successful response maps the Jellyfin user to a local user, maps Jellyfin administrator status to the Cued administrator role, encrypts the returned access token, and creates a random HTTP-only Cued session cookie. Database sessions store only a SHA-256 hash of the Cued session token.

tRPC request contexts resolve the same session and expose protected and administrator procedures. Server actions independently re-check administrator access before configuration or synchronization mutations.

## Secret storage

`CUED_ENCRYPTION_KEY` is the only new bootstrap secret. It must decode to 32 bytes. AES-256-GCM encrypts Jellyfin API keys and user access tokens with a fresh nonce and authentication tag for every value. The application can start without the key so initial URL setup and health checks remain available, but it refuses to store an API key or create a login session until encryption is configured. Secrets and credentials are never logged.

## Jellyfin configuration and synchronization

Admin → Integrations stores the Jellyfin URL, an encrypted API key, discovered server identity/version, health state and selected server-wide libraries. Connection failures update the integration to degraded without persisting response bodies.

A manual sync runs in either `updates` or `full` mode and performs these steps synchronously in the application process:

1. Decrypt the API key and load selected libraries.
2. Import movies, series, seasons and episodes while retaining useful raw provider data. Update mode requests Jellyfin's media cursor but still treats the returned IDs as a candidate index, batching writes and updating only changed payloads because Jellyfin servers may ignore the global filter. Full mode treats the response as the authoritative selected scope.
3. Import Jellyfin users and their administrator/disabled state.
4. Record per-user access to each imported library from Jellyfin policy.
5. Import each permitted user's played, play-count, progress and last-played state. Update mode uses Jellyfin's per-user last-saved cursor.
6. Reconcile removed users, libraries and watch states outside current permissions in both modes; reconcile missing media only after a full scan.
7. Record phase, current subject, totals, completion/failure and integration health in a durable sync run.

The most recent successful run's start time is the incremental cursor, with a small overlap so boundary updates are safely repeated through idempotent upserts. The first sync is always full. The admin UI polls the persisted run while it is active, so progress remains visible after a page reload. User avatars are proxied through an authenticated Cued route; Jellyfin credentials never appear in browser image URLs. Series completion is calculated against released episodes only. Media metadata enrichment, recommendations and playback remain outside Milestone 2.

## Database and migrations

The foundation migration creates `job_runs`. Milestone 2 migrations add integrations, users, sessions, media libraries, user-library access, media items, per-user media state, integration sync runs, progress/mode fields and avatar tags. Provider identifiers are unique within an integration, while Cued uses internal UUIDs for relations. Applied migrations are never edited; future changes use new forward-only migrations.

The development database client reuses its pool across hot reloads. Production uses a bounded PostgreSQL pool.

## UI and rendering

Pages and application data are server-rendered by default. Client Components are limited to browser-dependent theme state, interactive forms, account menus and toast feedback. The desktop sidebar is viewport-bound with an independently scrollable navigation region and persistent account controls. Theme preference is persisted in a cookie for immediate server rendering; CSS media queries handle the system default without a flash. All user-facing messages are maintained in English, Swedish and Dutch.

## Testing and delivery

Vitest covers environment validation, authenticated encryption, Jellyfin request/response mapping, authentication behavior, integration configuration, library/user synchronization, series completion, health, job execution and tRPC delegation. Provider tests use mocked HTTP fixtures and never require live credentials. CI runs installation, lint, strict type checking, tests and a production build. Docker uses the same committed migrations and standalone Next.js output as production.
