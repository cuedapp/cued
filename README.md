# Cued

Cued is a self-hosted media discovery application designed to help people answer “What should I watch next?”. This repository currently contains **Milestone 1 only**: the production-ready foundation and application shell. It does not yet connect to media services or provide recommendations.

See [the product specification](docs/PRODUCT.md), [roadmap](docs/ROADMAP.md), and [implemented architecture](docs/ARCHITECTURE.md).

## Requirements

- Node.js 24+
- pnpm 11.24.0 (managed through Corepack)
- PostgreSQL 17+, or Docker with Compose

## Local development

```bash
cp .env.example .env
corepack enable
pnpm install --frozen-lockfile
docker compose stop cued
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait postgres
pnpm dev
```

Open `http://localhost:3000`; Cued redirects to the English locale. Next.js reloads local source changes automatically. The development overlay publishes PostgreSQL on `127.0.0.1:5433`, matching the default `DATABASE_URL` in `.env`. Cued applies migrations when its Docker container starts; for a fresh local database, run `pnpm db:migrate` before starting `pnpm dev`.

`compose.dev.yaml` is intentionally opt-in and must not be used for production. Set `POSTGRES_PORT` if port 5433 is already in use, and update the port in `DATABASE_URL` to match.

## Docker deployment

```bash
docker compose up -d --build
```

The app is available on port `3000` by default. Set `CUED_PORT` to publish a different host port and set `POSTGRES_PASSWORD` for a non-development deployment. The named `cued-postgres` volume persists database data.

The Cued container waits for PostgreSQL, applies all migrations, and only then starts the web server. A migration error terminates the container rather than running against an unknown schema.

This production-style workflow builds an image from the current source; it does not watch or hot-reload files. Re-run the command after changes when verifying the containerized deployment.

## Configuration

Only bootstrap infrastructure belongs in the environment:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `CUED_PORT` | Compose only | `3000` | Host port |
| `POSTGRES_PASSWORD` | Compose only | `cued` | Database password; change outside local development |
| `POSTGRES_PORT` | Development overlay only | `5433` | Host port for the Docker PostgreSQL service; keep `DATABASE_URL` in sync |

Future provider settings will be stored through Cued, not added here. Never commit `.env` files or credentials.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Health is exposed at `GET /api/health`. It returns HTTP 200 only when both the application and database are healthy.

## Database changes

Edit `src/server/db/schema.ts`, then generate a migration:

```bash
pnpm db:generate
pnpm db:migrate
```

Commit both the schema and generated files under `drizzle/`.

## Current scope

Milestone 1 includes the multilingual responsive shell, theme controls, tRPC service path, PostgreSQL/Drizzle baseline, health reporting, structured logs, PWA metadata, an in-process job runner foundation, tests, Docker, and CI. Authentication, Jellyfin, TMDB, recommendations, media requests, notifications, and all other integrations intentionally remain future work.
