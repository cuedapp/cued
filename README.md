# Cued

Cued is a self-hosted media discovery application designed to help people answer “What should I watch next?”. The current **Milestone 10** implementation combines Jellyfin watch history, localized TMDB discovery, ratings, persistent personalized recommendations, optional OpenAI enhancement, managed Radarr/Sonarr requests, proactive following, notifications, and M3U Editor-backed STRM acquisition.

See [the product specification](docs/PRODUCT.md), [roadmap](docs/ROADMAP.md), and [implemented architecture](docs/ARCHITECTURE.md).

Release notes are maintained in [CHANGELOG.md](CHANGELOG.md). Every published GitHub Release must include the corresponding changelog section; the release workflow rejects an empty description before publishing a container image.

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

## Install with Docker Compose

### 1. Prerequisites

Install Docker Engine and Docker Compose v2. The released image is published to GHCR and PostgreSQL runs on an internal Docker network; PostgreSQL is not published to the host. Git is only needed if you want to keep the Compose file in a checkout.

```bash
git clone https://github.com/cuedapp/cued.git
cd cued
```

### 2. Create the environment file

Generate a stable encryption key and choose a strong database password:

```bash
cp .env.example .env
openssl rand -base64 32
openssl rand -hex 32
```

Edit `.env` and set at least these values:

```dotenv
CUED_ENCRYPTION_KEY=PASTE_THE_BASE64_KEY_HERE
POSTGRES_PASSWORD=PASTE_THE_DATABASE_PASSWORD_HERE
CUED_PORT=3000
CUED_STRM_HOST_PATH=./data/strm
LOG_LEVEL=info
```

Keep `CUED_ENCRYPTION_KEY` backed up. Cued uses it to encrypt Jellyfin sessions and integration credentials; losing or changing it makes stored secrets unreadable. Do not commit `.env`.

Create the STRM output directory. On Linux, Cued runs as UID/GID `1001` inside the container, so make the directory writable by that user:

```bash
mkdir -p data/strm
sudo chown -R 1001:1001 data/strm
```

Docker Desktop on macOS and Windows normally handles bind-mount permissions without the `chown` command.

### 3. Docker Compose example

The repository already includes this [`compose.yaml`](compose.yaml):

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: cued
      POSTGRES_USER: cued
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - cued-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cued -d cued"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  cued:
    image: ghcr.io/cuedapp/cued:latest
    environment:
      DATABASE_URL: postgresql://cued:${POSTGRES_PASSWORD}@postgres:5432/cued
      CUED_ENCRYPTION_KEY: ${CUED_ENCRYPTION_KEY:?Set CUED_ENCRYPTION_KEY in .env}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      CUED_STRM_ROOT: /strm
    volumes:
      - ${CUED_STRM_HOST_PATH:-./data/strm}:/strm
    ports:
      - "${CUED_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s
    restart: unless-stopped

volumes:
  cued-postgres:
```

The checked-in Compose file uses the released `ghcr.io/cuedapp/cued:latest` image by default. For an actual deployment, always set the two secrets in `.env` as shown above. If you maintain your own Compose file, the `${VARIABLE:?message}` syntax in this example prevents startup when they are missing. Pin `CUED_IMAGE` to a version tag or digest when you want reproducible upgrades.

Images are published automatically after an administrator publishes a GitHub release. The first release uses tag `v0.1.0`; the workflow verifies the source and then publishes `ghcr.io/cuedapp/cued:0.1.0`, a matching `0.1` tag, `latest`, and a commit tag. Publishing uses the repository-scoped GitHub Actions token and requires no registry secret. Public GHCR packages can be pulled without logging in.

### 4. Start Cued

```bash
docker compose pull
docker compose up -d --wait
docker compose logs -f cued
```

The Cued container waits for PostgreSQL, applies database migrations, and then starts the web server. A migration failure stops the container rather than running against an unknown schema. Once the health check passes, open `http://localhost:3000` or replace `localhost` with the Docker host’s address.

Complete the initial setup with the Jellyfin URL that is reachable **from the Cued container**. If Jellyfin is on the same Compose network, use its service name, for example `http://jellyfin:8096`. If it runs elsewhere, use the server’s LAN address; `localhost` inside the Cued container refers to Cued itself.

### 5. Share STRM files with Jellyfin

M3U Editor support is optional. When enabled, Cued writes `.strm` files below `/strm`. Jellyfin must see the same host directory. For a Jellyfin service in the same Compose project, add a read-only mount such as:

```yaml
services:
  jellyfin:
    # Keep the rest of your existing Jellyfin configuration.
    volumes:
      - ${CUED_STRM_HOST_PATH:-./data/strm}:/media/cued-strm:ro
```

Then create Jellyfin movie and series libraries pointing to `/media/cued-strm/movies` and `/media/cued-strm/series`. Their names are unrestricted. In Cued, select those exact libraries under **Settings → Integrations → M3U Editor**; the mappings control both user access and which Jellyfin items Cued identifies as STRM media.

### Updating and operating

Pull the latest released image:

```bash
docker compose pull cued
docker compose up -d --wait
```

For a reproducible deployment, set `CUED_IMAGE` in `.env`, for example `ghcr.io/cuedapp/cued:0.1.0`. You can also pin an image digest copied from GHCR. To build the current checkout locally instead, use the development override:

```bash
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
```

Useful commands:

```bash
docker compose ps
docker compose logs -f cued
docker compose restart cued
docker compose down
```

`docker compose down` preserves the named PostgreSQL volume. Do not add `--volumes` unless you intentionally want to delete the database. Back up both the `cued-postgres` volume and your stable `.env` encryption key. The production container does not watch source files; rebuilding is required after source changes.

## Configuration

Only bootstrap infrastructure belongs in the environment:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `CUED_ENCRYPTION_KEY` | For authentication and secrets | — | Base64-encoded 32-byte key used to encrypt provider tokens and API keys |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `CUED_STRM_ROOT` | Local app only | `./data/strm` | Root directory for generated Jellyfin `.strm` files |
| `CUED_STRM_HOST_PATH` | Compose only | `./data/strm` | Host directory mounted into Cued at `/strm`; also mount it into Jellyfin |
| `CUED_IMAGE` | Compose only | `ghcr.io/cuedapp/cued:latest` | Released Cued image tag or digest; use `compose.local.yaml` for a source build |
| `CUED_PORT` | Compose only | `3000` | Host port |
| `POSTGRES_PASSWORD` | Compose only | `cued` | Database password; change outside local development |
| `POSTGRES_PORT` | Development overlay only | `5433` | Host port for the Docker PostgreSQL service; keep `DATABASE_URL` in sync |

Jellyfin, TMDB, OpenAI, Radarr, Sonarr and M3U Editor credentials and configuration are stored through Cued, not added to the environment. Never commit `.env` files or credentials. Keep `CUED_ENCRYPTION_KEY` stable and backed up: changing or losing it makes stored provider and user tokens unreadable.

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

Milestones 1–10 cover the application foundation, Jellyfin synchronization, TMDB discovery, ratings and taste capture, persistent recommendations, optional AI enhancement, Radarr/Sonarr acquisition, following upcoming content or people, notifications, and M3U Editor-backed STRM acquisition. Viewing intent, operational recaps and portability remain future milestones.
