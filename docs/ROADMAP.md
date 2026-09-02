# Cued Development Roadmap

The roadmap is intentionally incremental. Each milestone should be functional and
verified before starting the next one.

## Current focus

**Milestone 18 — UI consistency and usability** is the currently approved
milestone. It is a focused refinement of the implemented application, not a new
product area. Earlier milestones remain below as delivery history and should not
be treated as active work.

## Shipped milestones

Milestones 1–17 are shipped. Their original scope and acceptance criteria remain
in this document as historical context; use the implementation and
[`ARCHITECTURE.md`](ARCHITECTURE.md) as the source of truth for what exists today.

---

# Milestone 18 — UI consistency and usability

Goal: make the existing product easier to understand and use through a coherent,
accessible interface across its established workflows.

Scope:

- establish shared desktop and responsive patterns for page headers, content
  widths, media-card density, filters, search controls, actions and states
- refine the dashboard's recommendation-first decision flow
- make discovery, title detail, library and recommendation actions predictable
  and consistent
- improve following, history, notifications and profile usability without
  changing their privacy rules
- improve requests and administration screens without broadening their existing
  provider capabilities
- provide resilient media-image loading and clear empty, loading and error
  states
- preserve context when navigating between browsing, filtering and detail views
- audit keyboard access, focus visibility, contrast and responsive behavior
- update localized copy in English, Swedish and Dutch for changed user-facing
  interfaces

Out of scope:

- new integrations, provider capabilities or recommendation algorithms
- changes to authorization, privacy boundaries or persisted data models except
  where a small corrective change is required to support the existing UI
- a wholesale visual rebrand

Acceptance criteria:

- shared controls and card actions behave consistently wherever they appear
- the principal user journey—discover, inspect, follow or request, and return to
  browsing—works without losing useful context
- large and small screens retain readable hierarchy and practical media density
- missing images and asynchronous states have intentional, non-disruptive
  presentation
- all changed user-facing text is localized in English, Swedish and Dutch
- focused regression coverage accompanies behavior changes

---

## Delivery history

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

Implementation status: complete.

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

Implementation status: complete.

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

Acceptance criteria:

- users opt in with their own ntfy server, credentials, topic and event preferences
- testing sends a notification without persisting unsaved provider values
- repeated scheduler runs do not duplicate successful notifications
- failed deliveries retry with backoff and stop after five attempts
- administrators are notified only after an integration reaches their configured consecutive-failure threshold

---

# Milestone 10 — M3U Editor

Goal: add an IPTV acquisition source that creates Jellyfin-ready STRM files.

Implementation status: complete for capabilities exposed by the current API.

First investigate current M3U Editor API capabilities.

Desired functionality:

- search/match movie availability
- search/match series availability
- preferably use TMDB IDs
- show availability alongside Jellyfin/Arr
- initiate STRM/add/sync actions where API permits

Important:

M3U Editor availability must never remove the Radarr/Sonarr request option.
Since not all users have access to these libraries, we should only show these options for the users with access to IPTV Shows and/or IPTV Movies.

Implemented scope:

- connect through the Xtream-compatible API without placing credentials in request URLs
- cache enabled movie and series availability by TMDB ID
- map movie and series visibility to administrator-selected Jellyfin libraries
- refresh availability manually and every six hours
- optionally trigger the public playlist-sync endpoint before a refresh
- show IPTV as a distinct availability source without disabling Radarr/Sonarr requests
- let eligible users add movies or series through IPTV as an alternative to Radarr/Sonarr
- preserve multiple sources for the same TMDB title and let the user choose by provider group and original title
- distinguish mapped STRM-library availability from ordinary Jellyfin availability while keeping downloaded-copy requests available
- generate one STRM file for a movie or one per series episode in a mounted output volume

Provider boundary:

- M3U Editor does not expose a supported per-title mutation through its management API. Cued reads enabled titles and deterministic playback endpoints from the exported Xtream playlist and writes the STRM files itself.

---

# Milestone 11 — Viewing intent

Goal: answer what the user wants to watch _right now_.

Implementation status: initial functional slice complete.

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

Implementation status: initial activity dashboard and admin user statistics complete.

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

Implementation status: complete.

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

# Milestone 14 — Releases, updates and operational polish

Implementation status: complete.

Goal: make Cued straightforward to release, upgrade and operate from versioned Docker images.

Release and GHCR build:

- publish versioned images to `ghcr.io/cuedapp/cued` from GitHub Actions
- trigger image publishing only for approved GitHub releases created from version tags such as `v1.0.0`
- run the complete CI suite before publishing an image
- publish immutable version tags plus a clearly documented stable tag
- attach OCI metadata linking the image back to the source repository and release
- document pulling by version or digest and rolling back to a previous image
- update the Docker Compose example to support both a released GHCR image and local `build: .`
- document migration backups and the expected upgrade procedure

Potential application functionality:

- GitHub release checking
- update-available indicator
- optional update notification
- release notes
- cache maintenance UI
- additional health diagnostics

Cued must not update its own Docker container.

---

# Milestone 15 — Fixes

Implementation status: complete.

- We're not periodically scanning the different integrations such as Jellyfin and M3U Editor.
  - This should be configured by the admin.
  - Let the admin decide how often we should update Jellyfin/M3U Editor.
  - This should be done in the background with clear information for the admin, toasts and internal notifications maybe?
- The applications favicon is missing and the icon for the webapp looks a bit strange. I like the logo we have on the site, create a favicon and a new icon for the webapp.
- Users should be notified when certain processes run.
  - Show toasts when they are running, when they are completed and when there is an error.
  - A notification log should be kept for the user to see what has been done, this list should be accessible somewhere in the navigation and show a number for new notifications and the user should be able to clear that. Please only have user specific notifications, only admin will see integration notifications
- Show user libraries in a different order, imported and allowed first, then imported and not allowed, not imported last.
- Sorting in people page, movies and series should be sortable by popularity, rating and whatever TMDB supports.
- Some issues in regards to watched state for series. Some series have "extras" or "specials" these should be ignored in watched state. F.e. Lost has been watched completely, but is only marked as watched by 80% or so.
- We write "Good evening" on the start page. We should use local time to write either good morning, afternoon, evening etc.
- Language choice should be saved on user level, so when the user logged in and saved a language, it should be saved for future use.
- User without watchstate gets error response: `Recommendation refresh failed No positive taste signals were found for recommendation discovery`. Instead we should show the top/trending list from TMDB.
- UI overhaul, look through all pages and fix irregularities.
  - Sync cards
  - Failed images should have a backup and possible different loading?
  - Add back button on detail pages, movie/series/person etc. possible filters should be saved when navigating back
- Availability filter on recommendations is incorrect, media in m3u editor are marked as available. We should add one more option there as well for this.

---

# Milestone 16 — Additional AI providers

Goal: give self-hosters a cost-conscious choice of AI services without weakening Cued's privacy or recommendation quality.

Implementation status: complete. OpenRouter is implemented with curated model
presets, structured-output validation, usage reporting and zero-data-retention
routing. A direct Z.ai integration is intentionally deferred because it does not
currently offer a material advantage over the OpenRouter route.

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

Implementation status: complete.

Delivery is split into three reviewable slices:

- **17A — Library history:** the paginated Library catalog, media/state filters, temporary viewing intent, removed-title presentation and returned-title behavior
- **17B — User profiles:** private self-profile and deliberate administrator access, with paginated current and historical acquisition requests
- **17C — Hardening and completion:** large-history and privacy regression coverage, navigation polish, documentation and the final acceptance-criteria audit

Build:

- user profile pages
- current and historical acquisition requests on each user's profile
- clear pending, approved, rejected, failed and completed/requested states
- links from request history to movie and series details
- a dedicated Library path for browsing the complete synchronized catalog
- movie and series filters for the library catalog
- provider-aware library rating filters and sorting using cached TMDB ratings and Radarr-supplied movie ratings
- the same temporary, combinable viewing-intent controls as Recommendations, without changing the user's taste profile
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

- Jellyfin session polling and a server-wide **Currently watching** view
  - regular users can see which titles are currently playing, their media type and anonymized playback progress, but not who is watching, their device, client, network details or playback method
  - administrators can additionally see the user, client, device, playback method, transcoding details, progress and relevant session diagnostics
  - represent active sessions separately from durable watch history, remove stale sessions promptly and degrade gracefully when Jellyfin is unavailable
  - make the polling interval configurable by an administrator and avoid requiring Redis or a separate worker for the initial implementation
  - cover the regular-user and administrator privacy boundary with focused authorization and response-shape tests
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
