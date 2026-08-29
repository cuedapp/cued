# Cued Architecture

This document describes the architecture implemented through Milestone 10. Future direction belongs in [PRODUCT.md](PRODUCT.md) and [ROADMAP.md](ROADMAP.md).

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
    ├── integrations/       Provider contracts and Jellyfin/TMDB implementations
    ├── jobs/               In-process job contracts and runner foundation
    └── security/           Authenticated secret encryption
messages/                   English, Swedish and Dutch messages
drizzle/                    Ordered forward-only SQL migrations
scripts/                    Runtime migration and entrypoint scripts
tests/                      Unit and mocked integration tests
```

Transport code calls application services; provider and persistence behavior remain behind their own boundaries. The Jellyfin client implements a media-server provider contract so later watch-history providers do not need to change application behavior. The TMDB, ntfy and M3U Editor clients expose domain models rather than leaking provider response shapes into pages.

## Request and authentication flow

`next-intl` assigns `/en`, `/sv` or `/nl`. The locale layout renders theme and translation providers. Public setup and login pages sit outside the authenticated route group; application pages use a nested server layout that redirects to setup or login before rendering the shell.

Initial setup verifies Jellyfin's public server information and stores its normalized base URL. A user login sends the submitted credentials directly to Jellyfin's authentication endpoint. Cued never persists the password. A successful response maps the Jellyfin user to a local user, maps Jellyfin administrator status to the Cued administrator role, encrypts the returned access token, and creates a random HTTP-only Cued session cookie. Database sessions store only a SHA-256 hash of the Cued session token.

tRPC request contexts resolve the same session and expose protected and administrator procedures. Server actions independently re-check administrator access before configuration or synchronization mutations.

## Secret storage

`CUED_ENCRYPTION_KEY` is the only bootstrap secret. It must decode to 32 bytes. AES-256-GCM encrypts Jellyfin API keys, Jellyfin user access tokens and the TMDB API Read Access Token with a fresh nonce and authentication tag for every value. The application can start without the key so initial URL setup and health checks remain available, but it refuses to store credentials or create a login session until encryption is configured. Secrets and credentials are never logged or placed in provider request URLs.

## Jellyfin configuration and synchronization

Admin → Integrations stores the Jellyfin URL, an encrypted API key, discovered server identity/version, health state and selected server-wide libraries. Connection failures update the integration to degraded without persisting response bodies.

A manual sync runs in either `updates` or `full` mode and performs these steps synchronously in the application process:

1. Decrypt the API key and load selected libraries.
2. Import movies, series, seasons and episodes while retaining useful raw provider data. Update mode requests Jellyfin's media cursor but still treats the returned IDs as a candidate index, batching writes and updating only changed payloads because Jellyfin servers may ignore the global filter. Full mode treats the response as the authoritative selected scope.
3. Import Jellyfin users and their administrator/disabled state.
4. Record per-user access to each imported library from Jellyfin policy.
5. Import each permitted user's played, play-count, progress and last-played state. Update mode uses Jellyfin's per-user last-saved cursor.
6. Reconcile removed users, libraries and watch states outside current permissions in both modes; reconcile missing media only after a full scan. Missing media is archived rather than deleted, preserving meaningful user watch state, ratings, tags and notes. Archived titles no longer count as available in Jellyfin and are reactivated if the same Jellyfin item returns.
7. Record phase, current subject, totals, completion/failure and integration health in a durable sync run.

The most recent successful run's start time is the incremental cursor, with a small overlap so boundary updates are safely repeated through idempotent upserts. The first sync is always full. The admin UI polls the persisted run while it is active, so progress remains visible after a page reload. User avatars are proxied through an authenticated Cued route; Jellyfin credentials never appear in browser image URLs. Series completion is calculated against released episodes only. Jellyfin TMDB provider IDs are retained on movie and series records for discovery matching.

## TMDB discovery and metadata

Admin → Integrations is a provider overview; every service has a dedicated route for its configuration, health and provider-specific controls. The TMDB page stores an encrypted API Read Access Token and connection health. The application authenticates with a bearer header and verifies configuration access before storing a new token. Search uses TMDB multi-search to return movies, series and people in one localized response. English maps to `en-US`, Swedish to `sv-SE` and Dutch to `nl-NL`.

Search responses are cached for 15 minutes; localized title and person details are cached for 24 hours. Cache keys include the resource identity and locale, so one language never serves another language's metadata. Expired rows are ignored and refreshed on demand. Title detail calls append credits, videos and external identifiers to avoid separate provider round trips. Pages render through React Server Components; client JavaScript is not needed to retrieve discovery data.

Availability matching is based on the pair of TMDB media type and ID. A title is marked available only if its matching Jellyfin movie or series belongs to a selected library accessible to the signed-in user. This prevents ID collisions between entity types and does not disclose media from denied libraries. People credits use the same matching rule.

## Database and migrations

The foundation migration creates `job_runs`. Milestone 2 migrations add integrations, users, sessions, media libraries, user-library access, media items, per-user media state, integration sync runs, progress/mode fields and avatar tags. Milestone 3 adds indexed TMDB IDs to Jellyfin media and a locale-aware provider metadata cache. Milestone 4 adds private per-user media feedback (ratings, tags, notes and exclusions), user display-format preferences and soft archival for removed media. Milestone 5 adds per-user persistent recommendations and locale-aware refresh state. Milestone 6 extends integrations with provider configuration, persists fingerprinted AI taste profiles and stores optional AI scores and explanations on recommendations. Milestone 7 adds acquisition requests and review audit data. Milestone 8 adds per-user follows and deduplicated follow events. Milestone 9 adds notification preferences and a deduplicated delivery ledger. Milestone 10 adds cached external media availability. Provider identifiers are unique within an integration, while Cued uses internal UUIDs for relations. Applied migrations are never edited; future changes use new forward-only migrations.

## Ratings and taste bootstrap

The authenticated History page reads only the signed-in user's synchronized movie, series and season states. Movies and series form the default view; watched seasons are available through an explicit filter for optional season ratings. A single feedback record per user and media item stores an optional 1–5 rating, tags, free-text feedback and an exclusion flag. The service refuses to save feedback for media outside that user’s history. Completed watch history automatically supplies the initial recommendation baseline; explicit ratings refine it and carry greater weight.

## Deterministic recommendations

The recommendation service builds a private genre-weighted profile from each user's completed and partially watched titles, explicit ratings, exclusions and positive recommendation feedback. Explicit ratings outweigh inferred engagement. Strongly liked titles seed TMDB's title-to-title recommendations, while genre discovery supplies broader fallback candidates. Title similarity receives a ranking boost; watched titles are removed across the user's complete history, negative genre signals reduce scores, and TMDB vote quality, confidence and popularity provide bounded secondary signals. Previous scores are blended into refreshed scores to reduce unnecessary churn.

Candidates are stored per user with their localized metadata, calculated match percentage, title-specific sources, genre reasons and feedback state. Refreshes upsert candidates without deleting older discoveries, turning the full Recommendations page into a persistent, filterable inbox; an explicit confirmed “start fresh” action clears that user’s inbox before regenerating it. Availability is resolved against the user's current Jellyfin library permissions when recommendations are read. Users can request more similar suggestions, hide a recommendation and restore hidden items. Dashboard access refreshes immediately when its signal fingerprint or locale changes and otherwise after 24 hours. A guarded in-process scheduler checks hourly for profiles whose daily refresh is due, matching Cued's single-container deployment model. Manual refresh is also available.

## Optional AI enhancement

OpenAI is implemented behind an AI provider contract and configured in the application with an encrypted API key, model and usage mode. Off leaves the deterministic pipeline unchanged. Conservative, Balanced and Enhanced send progressively larger local shortlists of 8, 12 or 20 candidates and blend AI reranking at 15%, 25% or 35%; AI never supplies the candidate universe. Up to 40 meaningful private taste signals—including ratings, tags and optional written feedback—produce a concise per-user profile. Signal fingerprints prevent unchanged profiles from being regenerated, while profile-and-shortlist fingerprints cache reranking for 30 days. Requests use the Responses API with strict structured output and disabled provider-side response storage. Provider errors fall back to deterministic results rather than failing recommendation generation. Users can explicitly refresh their AI profile.

## Radarr and Sonarr acquisition

Radarr and Sonarr share a small Arr provider contract while retaining separate encrypted connections and defaults. Administrators test unsaved credentials before persistence; a successful connection discovers root folders, quality profiles and tags. Saved configuration selects a default root folder and profile plus search-on-add, tags and Sonarr monitoring behavior. Administrators and users granted direct-request access can choose a root folder and quality profile for each request from search results, recommendation cards and title pages. Before adding a title, Cued resolves it through the provider by TMDB ID; an Arr item ID means it already exists and is reported without creating a duplicate. Provider failures update integration health and surface localized toast feedback.

Administrators always submit directly. Regular users require approval by default, with a per-user exemption managed by administrators. Approval-required users cannot select provider destinations or profiles; their submissions are persisted in `acquisition_requests` and remain visible after reloads. The administrator request queue resolves localized TMDB details and lets the reviewer select or change the root folder and quality profile before approving, or reject the request. Its filterable history shows approved, rejected and failed requests with their review and acquisition details. Approval is the only operation that contacts Radarr or Sonarr to add queued content. Review identity, timestamps, selected acquisition settings, provider item IDs and failures are retained for auditability.

The development database client reuses its pool across hot reloads. Production uses a bounded PostgreSQL pool.

## Following and proactive monitoring

Movies, series and people can be followed independently by each user. A follow stores localized display metadata and a compact comparison snapshot: season count for series and the complete known title-credit key set for people. Removing a follow also removes its private change history. The Following page groups upcoming releases or episodes, followed titles, followed people and detected updates; acquisition controls reuse the same permission and provider-state behavior as discovery pages.

An in-process hourly scheduler refreshes follows whose last successful check is at least 24 hours old. Fresh TMDB details are compared with the stored snapshot to detect new seasons, new credits and changed upcoming dates. Jellyfin availability plus global Cued/Radarr/Sonarr request state determines when a title becomes requestable. Changes are written as deduplicated follow events, creating a durable input for the notification-provider milestone without sending notifications prematurely. Users can also run the same refresh manually from the Following page.

## Notifications and external IPTV availability

Each user can configure their own ntfy server, topic and optional encrypted token. A five-minute scheduler derives deliveries from strong recommendations, follow events and consecutive integration failures. A unique provider/event key suppresses duplicates; failed deliveries use bounded exponential retry.

M3U Editor is configured by an administrator with encrypted credentials for an exported Xtream playlist, a separate encrypted M3U Editor API token, and the M3U Editor playback username. Cued posts Xtream credentials in the request body for catalogue calls, avoiding credential-bearing query URLs; the playback username may differ from the exported Xtream username. The API token lists the available playlists and the administrator must select one; `view` permission is sufficient for discovery, while `update` is needed only when enabling playlist refresh. Enabled VOD and series are cached by TMDB ID after configuration, manual refresh and a six-hour scheduled refresh. Every provider source is retained independently, including its Xtream category/group and original title, so an eligible user can choose between language or regional variants that share a TMDB ID. Administrators map movie and series access independently to Jellyfin libraries; only a user with synchronized access to a mapped library can invoke the corresponding IPTV action.

Jellyfin items in those mapped libraries are classified as STRM availability rather than ordinary library availability. Classification uses the administrator-selected library IDs, not library names or file extensions. The same mappings control which synchronized users may create movie or series STRM files. The UI marks mapped items in blue and continues to offer Radarr/Sonarr as a way to acquire a downloaded copy. Ordinary Jellyfin availability remains green and suppresses duplicate acquisition. A catalogue match that has not yet been written to Jellyfin is shown as STRM-requestable. IPTV never suppresses Radarr/Sonarr controls.

For an IPTV request, Cued writes a movie STRM file or fetches series details and writes one STRM file per episode. Each STRM entry uses M3U Editor's playlist UUID in the direct playback URL, allowing Jellyfin to stream from M3U Editor independently of Cued without exposing the Xtream password. The playlist UUID remains a bearer-style playback secret, so the STRM output must be readable only by the Jellyfin service. Paths are sanitized and confined beneath `CUED_STRM_ROOT`. Docker mounts a configurable host directory at `/strm`; the operator mounts the same content into Jellyfin and points the mapped movie and series libraries at the configured subdirectories. By default, Cued then requests a Jellyfin library scan through `POST /Library/Refresh`; administrators can disable this setting. The scan runs asynchronously inside Jellyfin, and a failure to start it does not undo successfully written STRM files. Administrators can separately opt in to M3U Editor playlist refresh before catalogue refresh; that needs an API token with update permission.

Every successful STRM write also creates a durable `job_runs` entry. A 15-second worker queries only the requested TMDB title in the mapped Jellyfin library. Once Jellyfin exposes it, Cued imports the title, series children when applicable, current user visibility and user state, then completes the job. Pending jobs survive restarts and time out after ten minutes; a later regular Jellyfin sync remains the fallback. While pending, pages show an amber “waiting for Jellyfin” state and poll for completion, after which server-rendered availability changes to the blue STRM state.

## UI and rendering

Pages and application data are server-rendered by default. Client Components are limited to browser-dependent theme state, interactive forms, account menus and toast feedback. The desktop sidebar is viewport-bound with an independently scrollable navigation region and persistent account controls; mobile navigation uses a compact menu popover. Search, title and person pages are server rendered. Theme preference is persisted in a cookie for immediate server rendering; CSS media queries handle the system default without a flash. All user-facing messages are maintained in English, Swedish and Dutch. The About card includes TMDB's required attribution and approved logo.

## Testing and delivery

Vitest covers environment validation, authenticated encryption, Jellyfin, TMDB, Radarr, Sonarr and OpenAI request/response mapping, authentication behavior, integration configuration, localized metadata caching, type-safe availability matching, library/user synchronization, series completion, recommendations, health, job execution and tRPC delegation. Provider tests use mocked HTTP fixtures and never require live credentials. CI runs installation, lint, strict type checking, tests and a production build. Docker uses the same committed migrations and standalone Next.js output as production.
