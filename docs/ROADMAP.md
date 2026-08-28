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
- automatic taste bootstrap from synchronized watch history

Acceptance criteria:

- each user maintains independent ratings
- ratings can be changed
- season ratings work
- existing Jellyfin history automatically provides the initial preference baseline
- manual ratings refine and outweigh inferred history signals

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

Implementation status: complete.

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
- per-request root-folder and quality-profile choices for administrators and users allowed to submit directly
- request movie
- request series
- request status
- administrator approval for non-admin requests
- administrator selection or override of root folder and quality profile when approving a pending request
- filterable administrator history for approved, rejected and failed requests, including acquisition settings and review details
- per-user direct-request permission
- failure handling
- provider health
- integration tests

Implementation status: complete.

Acceptance criteria:

- recommendation/search result can be requested
- normal request is approximately one click
- configured defaults are respected
- alternative profile can be selected where needed
- existing Arr content is recognized
- regular users require approval by default and administrators can grant direct-request access individually
- users who require approval cannot select acquisition settings; the approving administrator selects both root folder and quality profile

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

# Milestone 15 — Fixes

- Show user libraries in a different order, imported and allowed first, then imported and not allowed, not imported last.
- Sorting in people page, movies and series should be sortable by popularity, rating and whatever TMDB supports.
- Some issues in regards to watched state for series. Some series have "extras" or "specials" these should be ignored in watched state. F.e. Lost has been watched completely, but is only marked as watched by 80% or so.
- We write "Good evening" on the start page. We should use local time to write either good morning, afternoon, evening etc.

---

# Milestone 16 — Additional AI providers

Goal: give self-hosters a cost-conscious choice of AI services without weakening Cued's privacy or recommendation quality.

Build:

- OpenRouter integration with a curated, tested model list
- Z.ai evaluation, including GLM-5.3-Flash, with a direct integration only when it offers a clear advantage over OpenRouter
- provider-specific encrypted API-key configuration and connection testing
- model capability validation for strict structured output
- actual token and cost reporting where providers expose usage
- explicit zero-data-retention routing where supported
- clear disclosure of which taste and viewing signals leave the Cued server
- provider-independent recommendation evaluation fixtures

Acceptance criteria:

- switching providers does not require regenerating or losing local ratings and taste data
- only models verified for Cued's structured profile and reranking schemas appear as recommended presets
- provider failures continue to fall back to deterministic recommendations
- privacy controls and estimated or actual costs are visible before enabling a provider
- OpenRouter requests containing private taste data require zero-data-retention endpoints

---

# Milestone 17 — User profiles and library history

Goal: make personal activity and the media server's changing catalog visible over time.

Build:

- user profile pages
- current and historical acquisition requests on each user's profile
- clear pending, approved, rejected, failed and completed/requested states
- links from request history to movie and series details
- a dedicated Library path for browsing the complete synchronized catalog
- movie and series filters for the library catalog
- active, available and removed library-state filters
- persistent historical records when titles disappear from Jellyfin
- a clear Removed from library badge on archived media
- preservation of watch history, ratings, tags and request history for removed titles
- restoration of the active state when a previously removed title returns

Privacy and access rules:

- users can view their own profile and request history
- administrator access to other users' profiles must be deliberate and consistent with the existing Users administration area
- one user's private ratings, notes and taste data must not be exposed to another user

Acceptance criteria:

- a user can see ongoing and historical requests from their profile
- `/library` includes both current and historically synchronized movies and series
- removed titles are distinguishable and filterable without losing their associated history
- a later synchronization can mark a returned title as active without creating a duplicate
- library and profile views remain usable with large histories through pagination

---

# Future possibilities

Not committed roadmap items:

- Jellyfin plugin
- Trakt watch-history provider
- Plex/Emby providers
- Ollama
- direct Anthropic integration
- direct Gemini integration
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
