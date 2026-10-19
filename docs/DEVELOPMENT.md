# Cued development

Contributor procedures for local setup, verification, database changes and release publication. Use [AGENTS.md](../AGENTS.md#documentation-routing) for repository rules and document routing, [GLOSSARY.md](../GLOSSARY.md) for agreed meanings, and [CONTRIBUTING.md](../CONTRIBUTING.md) for the pull-request/review workflow. End-user installation and integration operations belong in the [README](../README.md).

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

## STRM development setup

When developing STRM behavior, use the [shared-volume setup](../README.md#4-share-strm-files-with-jellyfin) and [series operations guidance](../README.md#strm-series-operations). Local container builds need the same private, writable `/strm` mount and Jellyfin library mappings as released images; do not use private playback URLs in fixtures or logs.

## Browser E2E tests

Playwright uses a dedicated `cued_e2e` database, separate from the development
database. With the default local setup, the runner derives the PostgreSQL
connection details from `.env` but changes the database name to `cued_e2e`;
it creates that database if needed, applies migrations, clears only its
application tables, and inserts encrypted test integrations. Automatic
derivation is allowed only for local PostgreSQL. For a different local server,
set `CUED_E2E_DATABASE_URL` explicitly to a PostgreSQL user allowed to create
databases:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The suite starts local fake Jellyfin, TMDB, and M3U Editor endpoints, so it does
not contact real providers. It signs in through Cued's form and verifies
followed-title persistence, managed STRM source choices, and source selection
in the title request dialog. The runner refuses database names other than
`cued_e2e`; never point `CUED_E2E_DATABASE_URL` at a development or production
database.

Use `pnpm test:e2e:ui` for Playwright's interactive runner. The command-line
reporter names each test and shows failures inline; on failure, Playwright saves
a trace, screenshot and video under `test-results/`. Open the detailed HTML
report with `pnpm test:e2e:report`. CI uploads both directories as the
`playwright-report` artifact.

## Verification

Run the complete check suite before submitting a change:

```bash
pnpm format:check
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

## Release process

Use the [glossary](../GLOSSARY.md#work-and-delivery) to distinguish **prepare a release**, **create a release**, **done** and **shipped**. This procedure publishes Cued; it does not deploy it to an installation.

### Prepare

1. Identify the tested revision and the changes since the previous stable release. Choose the next version using the agreed [version-bump meanings](../GLOSSARY.md#patch-minor-and-major-release). Declaring 1.0 requires an explicit project-owner stability decision.
2. Update `package.json` and move the included Unreleased changelog entries into the matching `## [MAJOR.MINOR.PATCH]` section. Preserve entries not included in this release. Include explicit upgrade notes for breaking changes and applicable migrations/operator steps.
3. Run the verification commands above, exercise the changed behavior, and build/run the production image for runtime or deployment changes. Use the browser E2E suite when the changed path needs browser verification; CI also checks E2E and Docker builds.
4. Follow the [contribution workflow](../CONTRIBUTING.md#change-workflow) to prepare the release pull request from the tested `develop` revision to protected `main`. Obtain the required passing CI and independent approval; do not bypass protection or push directly to `main`.

For a **prepare a release** request, stop with the release PR or draft ready for review. Do not publish it merely because the preparation checks passed.

### Publish and verify

For a **create a release** request, continue after the required review and promotion:

1. Create the matching immutable `vMAJOR.MINOR.PATCH` source tag on the promoted release revision. The numeric version must match `package.json` and the changelog heading.
2. Publish the matching GitHub Release with the corresponding changelog section as its non-empty description. A stable release must not be marked as a prerelease.
3. Wait for [release verification and container publication](../.github/workflows/release.yml) to succeed. The workflow checks formatting, lint, strict types, tests, the application build and a production image build before publishing.
4. Verify that the versioned GHCR image contains both `linux/amd64` and `linux/arm64` variants, and that `latest` resolves to that stable release. Report the version, source tag/revision, image digest, workflow result and verification actually performed.

A published GitHub Release with a failed or unfinished image publication is not a completed release. Report the remaining step and blocker, not “shipped.” Never bypass a failed check, overwrite an immutable release tag, or deploy to a running installation as an implicit part of this task.

The current workflow accepts only numeric `vMAJOR.MINOR.PATCH` tags, including for a GitHub Release marked as a prerelease; suffixes such as `-rc.1` are not accepted. Prerelease publication does not update `latest`. A successful push to `develop` instead uses the [experimental workflow](../.github/workflows/publish-experimental.yml); it is not stable publication.

Operator deployment, backups, upgrades and schema-compatible rollback are documented in the [README](../README.md#updating-rollback-and-operating).

## Documentation maintenance

Use the [document routing map](../AGENTS.md#documentation-routing) when updating guidance. Record agreed terms in the glossary, product intent in PRODUCT, approved scope and delivery state in ROADMAP, implemented boundaries in ARCHITECTURE, contributor procedures here, operator procedures in README, and user-visible changes in CHANGELOG. Link to the owner of a policy instead of maintaining a second checklist.

Check Markdown formatting and local file/heading links after documentation changes. Do not mark a milestone shipped because its code is merely done or available in an experimental build.

## Responsible use

Cued is self-hosted software, not a central hosting, streaming, or content-distribution service. Contributors must not describe it as supplying media content: operators configure their own integrations and media sources, while Cued may store local metadata and create operator-directed STRM pointer files. The user-facing responsible-use notice belongs in the README and must remain separate from the AGPL license.
