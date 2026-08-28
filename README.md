# Cued

Cued is a self-hosted media discovery application designed to help people answer “What should I watch next?”. The current **Milestone 7** implementation combines Jellyfin watch history, localized TMDB discovery, ratings, persistent personalized recommendations, optional OpenAI enhancement, and direct Radarr/Sonarr requests.

See [the product specification](docs/PRODUCT.md), [roadmap](docs/ROADMAP.md), and [implemented architecture](docs/ARCHITECTURE.md).

## Requirements

- Node.js 24+
- pnpm 11.24.0 (managed through Corepack)
- PostgreSQL 17+, or Docker with Compose

## Local development

```bash
cp .env.example .env
# Generate a 32-byte key with `openssl rand -base64 32` and paste it into
# CUED_ENCRYPTION_KEY in .env before signing in or storing an API key.
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
| `CUED_ENCRYPTION_KEY` | For authentication and secrets | — | Base64-encoded 32-byte key used to encrypt provider tokens and API keys |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `CUED_PORT` | Compose only | `3000` | Host port |
| `POSTGRES_PASSWORD` | Compose only | `cued` | Database password; change outside local development |
| `POSTGRES_PORT` | Development overlay only | `5433` | Host port for the Docker PostgreSQL service; keep `DATABASE_URL` in sync |

Jellyfin, TMDB, OpenAI, Radarr and Sonarr credentials and configuration are stored through Cued, not added to the environment. Never commit `.env` files or credentials. Keep `CUED_ENCRYPTION_KEY` stable and backed up: changing or losing it makes stored provider and user tokens unreadable.

## Jellyfin setup

On first launch, Cued asks for the Jellyfin URL reachable from the Cued process. The API key is optional during this step, so an administrator can add it later under **Settings → Integrations**. Users sign in with their Jellyfin username and password; Cued sends the password directly to Jellyfin and never stores it. Jellyfin administrators are initially mapped to the Cued administrator role.

An administrator can select the libraries imported server-wide and start either an update sync or a full resync. Update syncs enumerate the media index but batch-write only changed payloads, and use Jellyfin's per-user change cursor for watch history. Full resyncs scan all media and watch state and reconcile deletions. Cued applies each Jellyfin user's library permissions separately when importing watch state. Synchronization progress survives page reloads and reports the active library or user, completed totals and remaining work.

**Settings → Users** lists synchronized Jellyfin users, roles, avatars and library permissions. Jellyfin remains authoritative: later synchronizations update existing records and remove local users, libraries, media and inaccessible watch state that no longer exist in the configured Jellyfin scope.

## TMDB setup and discovery

Create a TMDB API Read Access Token in your TMDB account, then save it under **Settings → Integrations**. The token is encrypted and sent to TMDB only as a bearer authorization header. It is never included in a request URL or displayed again.

Authenticated users can search movies, series and people through **Search**. Results and details use the active Cued language (English, Swedish or Dutch), and include posters, backdrops, cast, selected crew and YouTube trailers where TMDB provides them. Movie and series results are marked as available only when the signed-in user can access the matching Jellyfin library. Search responses are cached for 15 minutes and title/person details for 24 hours to avoid unnecessary TMDB requests.

Jellyfin synchronization retains TMDB provider IDs for movies and series. Run one **Full resync** after upgrading from Milestone 2 to populate identifiers for the complete existing library.

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

## Radarr and Sonarr requests

Administrators can configure Radarr and Sonarr independently under **Settings → Integrations**. Cued tests each connection and discovers root folders, quality profiles and tags before saving defaults. Movies and series can then be requested from search results, recommendation cards or title pages. Administrators and users allowed to submit directly can choose a root folder and quality profile for each request, with the configured values selected by default. Existing Arr titles are recognized by TMDB ID and are not added twice.

Administrators submit requests directly. Requests from regular users require approval by default and appear in the administrator **Requests** queue. Approval-required users cannot choose provider settings; the administrator selects or changes the root folder and quality profile while reviewing the request. The same page includes a filterable history of approved, rejected and failed requests. Under **Settings → Users**, an administrator can allow an individual user to submit directly instead. Pending and reviewed requests are stored in Cued so approval state survives page reloads.

## Current scope

Milestones 1–7 cover the application foundation, Jellyfin synchronization, TMDB discovery, ratings and taste capture, persistent recommendations, optional AI enhancement, and Radarr/Sonarr acquisition. Following upcoming content, notifications, M3U integration, viewing intent, operational recaps and portability remain future milestones.
