# Cued Development Roadmap

The roadmap is intentionally incremental.

Each milestone should be functional and verified before starting the next one.

---

# Milestone 1 — Foundation

Goal: establish a production-quality application skeleton without implementing Cued's recommendation features.

Build:

- private GitHub repository
- Next.js / TypeScript
- Tailwind
- shadcn/ui
- tRPC
- Zod
- Drizzle
- PostgreSQL
- Dockerfile
- Docker Compose
- minimal environment configuration
- database migrations
- application configuration foundation
- structured logging
- health endpoint
- initial responsive application shell
- dark/light theme foundation
- i18n foundation
- English/Swedish/Dutch translation structure
- admin/settings shell
- CI for lint/typecheck/tests/build
- basic test infrastructure
- README
- PRODUCT.md
- ROADMAP.md

Do **not** implement integrations yet.

Acceptance criteria:

- development environment starts successfully
- Docker deployment starts successfully
- PostgreSQL connection works
- migrations execute automatically
- basic UI loads
- tRPC round-trip works
- i18n works
- theme works
- CI passes
- no secrets committed

---

# Milestone 2 — Jellyfin foundation

Goal: make Cued understand users and their existing Jellyfin library/history.

Build:

- Jellyfin integration configuration
- encrypted secret storage
- Test Connection
- Jellyfin authentication
- Cued user mapping
- User/Admin roles
- Jellyfin library synchronization
- watch-state/history synchronization
- series/season/episode modeling as required
- integration health state
- manual sync
- sync job history
- integration tests using Jellyfin fixtures/mocks

Do not build recommendations yet.

Acceptance criteria:

- Jellyfin user can log into Cued
- users are independently represented
- Cued can identify watched/unwatched/in-progress media
- Cued can calculate series completion
- admin can inspect sync status
- failures are visible
- manual resync works

---

# Milestone 3 — TMDB and media model

Goal: connect Jellyfin media with the external discovery universe.

Build:

- TMDB integration
- TMDB IDs as important external identifiers
- movie/series metadata
- posters/backdrops
- cast/crew
- trailers
- search
- people search
- title detail pages
- metadata caching
- localized metadata
- availability marker for Jellyfin content

Acceptance criteria:

- search finds movies/series/people not in Jellyfin
- local Jellyfin titles are recognized
- title pages work
- trailers work
- metadata caching prevents unnecessary requests

---

# Milestone 4 — Ratings and taste bootstrap

Goal: start collecting explicit preference data.

Build:

- 1–5 movie ratings
- 1–5 series ratings
- optional season ratings
- watched/history page
- filters/sorting
- rating prompts
- optional written feedback
- Ignore/Exclude where appropriate
- initial onboarding taste-training flow

Acceptance criteria:

- each user maintains independent ratings
- ratings can be changed
- season ratings work
- onboarding can bootstrap preferences from existing Jellyfin history
- user can skip onboarding

---

# Milestone 5 — Recommendation engine v1

Goal: provide useful personalized recommendations without requiring AI.

Build:

- TMDB candidate generation
- genre/metadata similarity
- watch engagement signals
- rating weighting
- candidate filtering
- recommendation scoring
- persistent recommendations
- recommendation stability/decay
- change-driven refresh logic
- dashboard recommendation sections
- recommendation feedback
- reversible ignore/hide
- manual recommendation refresh
- scheduled daily refresh

Acceptance criteria:

- recommendations differ meaningfully between users
- completed/rated media affects recommendations
- recommendations do not unnecessarily churn daily
- ignored content behaves correctly
- already available Jellyfin content is marked

---

# Milestone 6 — AI-enhanced recommendations

Goal: add optional nuanced preference understanding.

Initial provider:

OpenAI.

Build:

- AI provider interface
- OpenAI implementation
- taste-profile generation
- written-feedback interpretation
- shortlist reranking
- recommendation explanations
- AI result caching
- token/cost-conscious behavior
- AI disabled mode
- manual profile refresh

Possible later configuration:

- Off
- Conservative
- Balanced
- Enhanced

Acceptance criteria:

- Cued works without an AI key
- AI enhances rather than replaces deterministic recommendations
- repeated jobs do not unnecessarily reprocess unchanged data
- recommendation explanations remain concise

---

# Milestone 7 — Radarr and Sonarr

Goal: turn discovery into acquisition.

Build:

- Radarr integration
- Sonarr integration
- provider configuration UI
- connection testing
- root-folder discovery
- quality-profile discovery
- configurable defaults
- optional alternative profiles
- request movie
- request series
- request status
- failure handling
- provider health
- integration tests

Acceptance criteria:

- recommendation/search result can be requested
- normal request is approximately one click
- configured defaults are respected
- alternative profile can be selected where needed
- existing Arr content is recognized

---

# Milestone 8 — Following and upcoming content

Goal: make Cued proactive.

Build:

- follow movies
- follow series
- follow people
- upcoming release monitoring
- new season detection
- new credit detection for followed people
- requestability monitoring
- Following page

Acceptance criteria:

- followed titles persist
- new relevant credits can be detected
- followed title can become requestable without being rediscovered manually

---

# Milestone 9 — Notifications

Goal: notify users of meaningful changes.

Build notification-provider interface.

Initial provider:

- ntfy

Initial events:

- strong new recommendation
- followed content becomes requestable
- new season
- persistent request/integration failure

Build:

- per-user notification preferences
- provider testing
- duplicate/noise suppression
- failure thresholds

---

# Milestone 10 — M3U Editor

Goal: add another media availability source.

First investigate current M3U Editor API capabilities.

Desired functionality:

- search/match movie availability
- search/match series availability
- preferably use TMDB IDs
- show availability alongside Jellyfin/Arr
- initiate STRM/add/sync actions where API permits

Important:

M3U Editor availability must never remove the Radarr/Sonarr request option.

---

# Milestone 11 — Viewing intent

Goal: answer what the user wants to watch *right now*.

Build temporary recommendation context:

- Easy watch
- Action
- Something clever
- Light/funny
- Movie tonight
- Start a series
- Surprise me
- free-text intent

Intent modifies recommendation ranking without permanently altering the user's taste profile.

---

# Milestone 12 — Server activity and recaps

Build selected statistics:

- recent watch activity
- popular on this server
- aggregate ratings
- watch time
- viewing trends

Later:

- monthly recap
- yearly Wrapped-style recap

Avoid turning Cued into a general analytics platform.

---

# Milestone 13 — Backup and portability

Build:

- full backup
- restore
- user-data export
- user-data import

Portable data should prioritize:

- ratings
- feedback
- follows
- preferences

Avoid unnecessarily exporting recreatable caches.

---

# Milestone 14 — Updates and operational polish

Potential functionality:

- GitHub release checking
- update-available indicator
- optional update notification
- release notes
- cache maintenance UI
- additional health diagnostics

Cued must not update its own Docker container.

---

# Future possibilities

Not committed roadmap items:

- Jellyfin plugin
- Trakt watch-history provider
- Plex/Emby providers
- Ollama
- Anthropic
- Gemini
- web push
- Gotify
- Discord
- dedicated worker
- Redis
- job queue
- Turborepo migration
- public REST API
- mobile/native client

These should only be implemented when there is a demonstrated need.