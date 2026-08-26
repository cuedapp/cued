# Cued

Cued is a self-hosted media discovery application designed to help people answer “What should I watch next?”. This repository currently contains **Milestone 1 only**: the production-ready foundation and application shell. It does not yet connect to media services or provide recommendations.

See [the product specification](docs/PRODUCT.md), [roadmap](docs/ROADMAP.md), and [implemented architecture](docs/ARCHITECTURE.md).

## Requirements

- Node.js 24+
- npm 11+
- PostgreSQL 17+, or Docker with Compose

## Local development

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`; Cued redirects to the English locale. PostgreSQL must match `DATABASE_URL`. A quick local database can be started with `docker compose up -d postgres`.

## Docker deployment

```bash
docker compose up -d --build
```

The app is available on port `3000` by default. Set `CUED_PORT` to publish a different host port and set `POSTGRES_PASSWORD` for a non-development deployment. The named `cued-postgres` volume persists database data.

The Cued container waits for PostgreSQL, applies all migrations, and only then starts the web server. A migration error terminates the container rather than running against an unknown schema.

## Configuration

Only bootstrap infrastructure belongs in the environment:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `CUED_PORT` | Compose only | `3000` | Host port |
| `POSTGRES_PASSWORD` | Compose only | `cued` | Database password; change outside local development |

Future provider settings will be stored through Cued, not added here. Never commit `.env` files or credentials.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Health is exposed at `GET /api/health`. It returns HTTP 200 only when both the application and database are healthy.

## Database changes

Edit `src/server/db/schema.ts`, then generate a migration:

```bash
npm run db:generate
npm run db:migrate
```

Commit both the schema and generated files under `drizzle/`.

## Current scope

Milestone 1 includes the multilingual responsive shell, theme controls, tRPC service path, PostgreSQL/Drizzle baseline, health reporting, structured logs, PWA metadata, an in-process job runner foundation, tests, Docker, and CI. Authentication, Jellyfin, TMDB, recommendations, media requests, notifications, and all other integrations intentionally remain future work.
