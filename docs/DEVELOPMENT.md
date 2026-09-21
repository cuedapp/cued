# Cued development

This document is for contributors and local development. User installation instructions are in the [README](../README.md).

## Requirements

- Node.js 24+
- pnpm 11.24.0 through Corepack
- Docker Engine with Docker Compose v2

## Local development

Copy the environment template, set `POSTGRES_PASSWORD=cued`, and generate a stable encryption key:

```bash
cp .env.example .env
openssl rand -base64 32
```

Paste the key into `CUED_ENCRYPTION_KEY` in `.env`, then install dependencies and start the isolated development PostgreSQL project:

```bash
corepack enable
pnpm install --frozen-lockfile
docker compose -p cued-dev -f compose.yaml -f compose.dev.yaml up -d --wait postgres
pnpm db:migrate
PORT=3003 pnpm dev
```

Open `http://localhost:3003`. The development overlay publishes PostgreSQL on
`127.0.0.1:5434` by default and uses the separate `cued-dev` Compose project.
This deliberately avoids the production `cued` and `cued-db` containers. Set
`POSTGRES_PORT` and update `DATABASE_URL` if that development port is already
in use.

The root `.env.example` is intentionally for this host-based development workflow. Docker Compose users installing a released image should use `.env.compose.example`, as documented in the user-facing README.

`compose.dev.yaml` is intentionally opt-in and must not be used for production. The production container does not watch source files; use `compose.local.yaml` when you need to build the current checkout into a container:

```bash
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
```

## Verification

Run the complete check suite before submitting a change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

When changing Docker or runtime behavior, also validate Compose expansion and, where practical, build and run the image locally.

## Database changes

Edit `src/server/db/schema.ts`, then generate and apply a forward-only migration:

```bash
pnpm db:generate
pnpm db:migrate
```

Commit both the schema and generated files under `drizzle/`. Never edit a migration that may already have been applied.

## Project guidance

Read [`AGENTS.md`](../AGENTS.md), [`docs/PRODUCT.md`](PRODUCT.md), and [`docs/ROADMAP.md`](ROADMAP.md) before making architectural changes. Keep user-facing text in all three locale files, use canonical Tailwind utilities, and prefer Server Components unless client behavior is required.

## Responsible use

Cued is self-hosted software, not a central hosting, streaming, or content-distribution service. Contributors must not describe it as supplying media content: operators configure their own integrations and media sources, while Cued may store local metadata and create operator-directed STRM pointer files. The user-facing responsible-use notice belongs in the README and must remain separate from the AGPL license.
