# Cued

> A self-hosted media discovery and recommendation platform that learns what users enjoy, helps them decide what to watch next, tracks upcoming content, checks availability across media sources, and can request content through external media-management services.

**Working name:** Cued

## Product vision

Cued sits above an existing self-hosted media stack.

It is **not** a media server, player, download manager, or library manager. Instead, it connects existing services to answer:

**What should I watch next?**

Cued should combine aspects of applications such as Seerr, Streamystats and SuggestArr while focusing primarily on personalized discovery.

The intended lifecycle is:

**Discover → Follow → Request → Available → Watch → Rate → Learn → Recommend**

Cued should be usable independently of any particular homelab configuration. Integrations are optional and provider-based wherever practical.

---

# Core principles

## Self-hosted first

Cued must be easy to deploy using Docker.

Initial deployment should require approximately:

- Cued application
- PostgreSQL

Avoid Redis, separate workers, queues or additional infrastructure until they provide a meaningful benefit.

The architecture should allow these to be introduced later.

## Configuration through the application

Keep environment variables to the minimum required to bootstrap Cued.

Service integrations should be configured through:

**Admin → Integrations**

Examples:

- Jellyfin
- TMDB
- Radarr
- Sonarr
- OpenAI
- M3U Editor
- ntfy

Integration screens should support connection testing and automatic discovery of configuration where APIs allow it.

Secrets must be stored securely/encrypted.

## Provider-oriented architecture

External services should be represented by clean provider interfaces rather than being deeply embedded in application logic.

Initial implementations may only support one provider while retaining an abstraction that allows alternatives later.

Examples:

### Watch history

Initial:

- Jellyfin

Possible future providers:

- Trakt
- Plex
- Emby

### AI

Initial:

- OpenAI

Possible future providers:

- Ollama
- Anthropic
- Gemini
- other OpenAI-compatible APIs

### Notifications

Initial:

- ntfy

Possible future providers:

- email
- Discord
- Gotify
- web push
- others

### Acquisition

Initial:

- Radarr for movies
- Sonarr for series

### Media availability

Initial:

- Jellyfin
- M3U Editor, where its API permits

---

# Users and authentication

Cued must support multiple users from the beginning.

Initial authentication uses Jellyfin.

A Jellyfin user is mapped to a local Cued user. Cued stores its own user-specific data such as:

- ratings
- feedback
- follows
- ignored recommendations
- recommendation profile
- preferences
- language
- recommendation history

Cued also maintains application-level roles.

At minimum:

- User
- Admin

Admins can configure integrations and inspect individual user activity.

Regular users should generally see aggregate server-wide activity rather than detailed private activity of other users.

Avoid terminology such as "household", since users of a Jellyfin server are not necessarily members of the same household.

Prefer terminology such as:

- Users
- On this server
- Popular on this server

---

# Watch history

Jellyfin is the initial source of truth for watch activity.

The underlying architecture must allow additional watch-history providers later.

Store useful raw activity rather than reducing everything immediately to liked/disliked.

Relevant signals include:

- movie completion
- episode completion
- series completion percentage
- season completion
- repeat watches
- last watched date
- current/in-progress viewing
- explicit Cued rating
- explicit feedback
- ignored/excluded content

## Initial inferred preference

Until a user provides explicit ratings, completed content can be treated as a positive preference signal.

For series, completion should be weighted rather than binary.

Rough guidance:

- 90–100% released content watched → strong positive signal
- 50–90% → positive signal
- 20–50% → mostly neutral
- <20% → neutral rather than automatically negative

Currently airing series should calculate completion against currently released episodes.

These thresholds should remain implementation details that can evolve.

Explicit ratings always carry more weight than inferred engagement.

---

# Ratings

Cued uses a **1–5 star rating system**.

## Movies

One rating per user.

## Series

Support:

- overall series rating
- optional season ratings

Episode ratings are not initially required.

Ratings can be added or changed from a dedicated watched/history interface.

Recently completed content may also appear as lightweight rating prompts on the dashboard.

## Contextual feedback

After rating something, users may optionally provide additional information about why they liked or disliked it.

Feedback should never be mandatory.

Examples:

- great mystery
- too much drama
- liked the characters
- boring pacing
- good easy action movie

AI providers may later interpret this feedback to improve the user's taste profile.

---

# Taste profile

Cued should build a nuanced taste profile rather than relying only on genres.

For example, instead of only learning:

> Likes science fiction.

Cued might learn:

> Likes mystery-driven serialized stories, isolated settings, conspiracies, gradual reveals and grounded science fiction.

Taste profiles can use:

- watch history
- ratings
- season ratings
- rewatches
- explicit feedback
- recommendation interactions

The profile should be inspectable eventually so users can understand and potentially correct what Cued believes about their preferences.

---

# Viewing intent

Long-term taste is different from what someone wants to watch right now.

Cued should eventually support temporary viewing intent.

Examples:

- Easy watch
- Action / turn-your-brain-off
- Something clever
- Light/funny
- Start a new series
- Movie tonight
- Surprise me

Users should also be able to provide free-text intent such as:

> I want a straightforward Jason Statham-style action movie around two hours long.

Temporary intent should influence recommendations without permanently altering the user's taste profile.

---

# Recommendation pipeline

TMDB should provide the primary candidate universe.

Cued should not normally ask an AI model to invent arbitrary movie or series titles.

Initial conceptual pipeline:

**TMDB candidates → filtering → metadata/similarity scoring → shortlist → optional AI analysis/reranking → stored recommendations**

Candidate sources can include:

- popular
- trending
- upcoming
- new releases
- TMDB recommendations
- similar titles
- discovery queries
- older relevant titles

The system must not focus only on currently popular content. Discovering older content the user may have missed is important.

## AI usage

AI should be optional.

Without AI, Cued must remain capable of producing useful recommendations.

AI can enhance:

- nuanced taste profiles
- interpretation of written feedback
- current viewing intent
- candidate reranking
- recommendation explanations

Default AI usage should be cost-conscious.

Do not send enormous candidate sets to an AI provider.

Prefer:

**large candidate pool → local scoring → small shortlist → AI**

Cache AI analysis whenever practical.

Do not repeatedly spend tokens analyzing the same title against an effectively unchanged taste profile.

AI usage levels may later become configurable.

---

# Recommendation stability

Recommendations should not completely regenerate merely because a daily job ran.

Recommendation changes should be driven by meaningful new signals.

For example, watching another episode of the same series on consecutive days should usually have little impact.

Meaningful events might include:

- completing a series
- new explicit ratings
- significant feedback
- several newly watched titles
- major taste-profile changes
- relevant newly released/upcoming TMDB content

Strong recommendations should persist unless there is a reason to replace them.

The system should nevertheless introduce some fresh discovery over time.

---

# Recommendation feedback

Users must be able to hide/ignore recommendations.

Ignoring should be reversible.

Possible reasons:

- Already watched elsewhere
- Not interested in this title
- Not in the mood
- Don't recommend similar content
- Other

Different reasons should have different recommendation effects.

For example:

**Not in the mood** should not become a strong negative taste signal.

**Don't recommend similar content** should influence future recommendations.

Provide an area where ignored/hidden recommendations can be reviewed and restored.

---

# Recommendation explanations

Recommendation cards should remain visually clean.

Detailed title views may provide concise explanations such as:

- why Cued thinks the user will like the title
- relevant highly rated titles
- matching preference traits
- potential mismatch

Avoid overwhelming users with excessive AI-generated explanation.

---

# Dashboard

Initial dashboard concepts:

## Continue / Watch next

Current/in-progress content from Jellyfin.

## Top picks for you

Strongest personalized recommendations.

## Because you liked…

Recommendations associated with specific highly rated content.

## New & popular for you

Recent/popular content filtered through personal taste.

## Coming soon

Upcoming content predicted to match the user.

## Available in your library

Recommended titles already available in Jellyfin but not watched.

## Recently added

Relevant recently added Jellyfin content.

Dashboard composition can become configurable later.

---

# Search and discovery

Global search should query TMDB rather than only the local library.

Results should layer local/integration state onto TMDB results.

Possible states:

- Available in Jellyfin
- Available through M3U Editor
- Requested
- Requestable
- Followed

Search should support:

- movies
- series
- people

People pages should expose filmography and personalized relevance where appropriate.

---

# Title details

Title pages should provide a media-focused experience similar in spirit to Seerr.

Potential information:

- poster
- backdrop
- title
- synopsis
- release information
- genres
- runtime
- cast/crew
- trailers
- user rating
- server-wide aggregate ratings/activity
- recommendation explanation
- availability
- follow state
- request state/actions

Trailers should be playable from the title page using available TMDB video metadata.

---

# Availability

Availability and acquisition are separate concepts.

A title may simultaneously be:

- available in Jellyfin
- available through M3U Editor
- requestable through Radarr/Sonarr

Cued should not assume that availability through M3U Editor means the user does not want a local copy.

For example, a movie could expose:

- Play
- Add/sync STRM
- Request via Radarr

depending on provider capabilities.

---

# M3U Editor

M3U Editor support should be optional.

Its API capabilities must be investigated during implementation rather than assumed.

Desired capabilities include:

- detect whether recommended movie/series content is available
- preferably identify content through TMDB IDs
- where supported, initiate appropriate STRM/add/sync operations

M3U Editor availability must not remove the ability to request the title through Radarr/Sonarr.

---

# Radarr and Sonarr

Cued should integrate directly with Radarr and Sonarr rather than requiring Seerr.

During configuration, Cued should query available configuration where possible.

Examples:

- root folders
- quality profiles
- tags
- monitoring settings

Admins configure sensible defaults.

Normal requests should therefore be approximately one-click operations.

Support different configured profiles where needed, for example:

- standard movie profile
- children's/multilanguage movie profile

Initial scope does not require recreating all Seerr functionality.

Do not initially build:

- complex approval workflows
- quotas
- elaborate permissions
- multiple 4K server workflows
- every advanced Arr configuration option

---

# Following

Users can follow:

- movies
- series
- people

Following a title allows Cued to monitor changes such as:

- release date
- requestability
- availability
- new seasons

Following a person allows Cued to discover new relevant credits.

Example:

> New Jason Statham movie discovered.

The user can then inspect or request it.

Following a person must not automatically request their content.

---

# Notifications

Notification providers should be modular.

Initial provider:

- ntfy

Initial useful events:

- strong new recommendations
- followed content becomes requestable
- new season detected
- request/integration failures

Notification volume should be conservative.

Temporary service failures should not immediately spam users. Repeated failures can escalate into notifications.

---

# Watch history and statistics

Watch history is a core feature.

Users should have a dedicated watched/history page supporting:

- movies
- series
- filtering
- sorting
- rating
- rating changes

Detailed analytics are secondary.

Potential later statistics:

- watch time
- movies watched
- episodes watched
- favorite genres
- favorite actors/directors
- rating distribution
- viewing trends

Cued may eventually provide Spotify Wrapped-style:

- monthly recaps
- yearly recaps

Server-wide aggregate activity can show what is popular among users.

Admins may inspect individual user activity.

---

# Onboarding

After importing Jellyfin watch history, users should optionally be offered a taste-training workflow.

Cued selects useful previously watched titles and asks the user to quickly rate them.

For example:

> Rate 10 more titles to improve your recommendations.

Users can skip any title or the entire process.

Selection should favor titles that provide useful preference information.

---

# Internationalization

Internationalization should be supported from the foundation.

Initial UI languages:

- English
- Swedish
- Dutch

Translations should be stored in a contributor-friendly format.

UI language and media metadata language should ideally be independently configurable.

---

# PWA/mobile

Cued must be responsive.

PWA/installability should be supported early.

Advanced offline functionality is not initially required.

---

# Admin experience

Admin areas should include:

## Integrations

Configure and test external services.

## System / Jobs

Show meaningful job/sync information such as:

- job name
- last execution
- success/failure
- duration
- useful result summary
- recent error

Detailed logs remain available through Docker stdout/stderr.

## Maintenance

Eventually provide targeted actions such as:

- resync Jellyfin
- refresh TMDB metadata
- rebuild recommendations
- clear cache

Avoid dangerous ambiguous "reset everything" actions.

---

# Runtime integration health

Cued should monitor configured providers.

Possible states:

- Connected
- Degraded
- Unavailable

Track:

- last successful connection
- last successful sync
- consecutive failures
- last error

Persistent failures may trigger configured notifications.

---

# Caching

Cued should automatically manage caches and cleanup.

Potential cached information:

- TMDB metadata
- discovery results
- recommendation candidates
- AI analysis
- provider state

Admins should have manual maintenance controls when troubleshooting.

---

# Backups

Backup/restore is a later feature, not MVP.

Eventually support:

## Full application backup/restore

For disaster recovery.

## Portable user data export/import

Examples:

- ratings
- follows
- feedback
- preferences

Avoid requiring users to export recreatable caches.

---

# Updates

Database migrations should normally run automatically during application/container startup.

Release documentation should recommend creating a backup before upgrades involving migrations.

Later, Cued may check GitHub releases and inform admins when an update is available.

Cued should not automatically update its own Docker container.

---

# Technical stack

Initial stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- tRPC
- Zod
- Drizzle ORM
- PostgreSQL

Use Git from the first commit.

Initial repository is a single application rather than a monorepo.

Code boundaries should make migration to Turborepo straightforward if Cued later grows into multiple applications/packages.

Potential future packages might include:

- `@cued/api`
- `@cued/db`
- `@cued/integrations`
- `@cued/recommendations`

Do not introduce monorepo complexity until necessary.

---

# API architecture

Do not bury business logic inside React components, route handlers or tRPC procedures.

Use a clean service/domain layer.

tRPC is the primary internal web API.

Selected functionality may later be exposed through REST for external clients such as a Jellyfin plugin.

Both API styles must call the same underlying application services.

---

# Validation and type safety

Use TypeScript throughout.

Use Zod for runtime validation, particularly:

- tRPC input
- configuration
- external API responses where appropriate
- environment variables
- boundaries involving untrusted data

External provider data should be normalized into Cued's internal domain types.

---

# Database

PostgreSQL is the primary database.

Use Drizzle for schema/query management and migrations.

Store durable source facts rather than only derived recommendation results.

Important conceptual entities will likely include:

- users
- roles
- media
- watch events/state
- ratings
- season ratings
- feedback
- follows
- recommendations
- recommendation interactions
- taste profiles
- integrations
- provider state
- jobs
- notifications
- cached metadata

The exact schema should evolve during implementation rather than being prematurely frozen.

---

# Testing

Do not chase 100% coverage.

Prioritize meaningful tests.

Use:

- unit tests for important business/recommendation rules
- integration tests for providers/services
- mocked external APIs
- selected end-to-end tests for critical flows

CI should at minimum perform:

- lint
- type checking
- tests
- build verification

Runtime integration health is separate from CI testing.

---

# Logging and observability

Use structured application logging to stdout/stderr.

Logs must work naturally with:

`docker logs`

Admin UI should summarize jobs and provider health rather than attempting to replace a full log-management system.

---

# Deployment

Primary deployment target:

Docker Compose on a Linux home server.

Initial architecture:

**Cued application + PostgreSQL**

Avoid mandatory Redis or worker infrastructure.

Design job/cache abstractions so Redis, queues and dedicated workers can be introduced later if scale requires them.

A future public release should publish versioned images through GHCR.

---

# Repository

Development starts in a private GitHub repository.

Structure the project as though it may eventually become public.

Requirements:

- no secrets committed
- useful README
- documented Docker deployment
- database migrations committed
- clean Git history
- sensible `.gitignore`
- automated CI

Licensing can be decided before public release.

---

# Explicit non-goals

Cued is not intended to replace:

- Jellyfin playback/streaming
- Jellyfin library management
- Radarr/Sonarr media management
- Prowlarr/indexer management
- download clients
- TMDB metadata
- IPTV players

M3U Editor integration concerns discovery/availability/actions, not IPTV playback.

Cued also does not initially need to reproduce every Seerr permission, quota or approval feature.

---

# Development principle

Development must be milestone-driven.

Do not implement future features merely because they appear in this specification.

Complete, test and verify each foundation before building the next layer.

Architecture should anticipate future functionality without prematurely implementing it.
