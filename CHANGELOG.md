# Changelog

All notable Cued releases are documented here. GitHub Release descriptions should include the matching section from this file.

## [0.6.0] — Household discovery and live activity

This release includes the Milestone 19 work completed since v0.5.1. Milestone
19 remains in progress; collection discovery and requests, conversational AI
recommendations, and the remaining roadmap items are not part of this release.

### Added

- Added Explore for trending and upcoming movies and series, with media-type,
  genre, rating, language, daily-show, and sort controls, progressive loading,
  and preserved filters when navigating to and from title details.
- Added preferred original-language settings and applied them to discovery and
  recommendations.
- Added privacy-aware live Jellyfin sessions to the start page, including
  playback progress and session details, support for multiple concurrent
  sessions, and a ten-second refresh interval.
- Added a shared poster-badge treatment for ratings and media metadata across
  library, search, Explore, recommendation, collection, and person-related
  cards.
- Added user-selectable, localized date formats, including readable
  day-first and month-first dates, and included the preference in user backup
  and restore.

### Changed

- Made past title dates read as “Released on” rather than future-tense release
  copy, and applied each user's chosen date format to relevant title and
  activity dates.
- Hid guest and self appearances by default on person detail pages.
- Improved content-rating and media-type badge consistency while retaining
  separate visual treatment for availability and other distinct card actions.

### Fixed

- Corrected notification detail rendering so title placeholders and followed
  user names display correctly.

### Milestone status

- Milestone 19 is not complete in this release. Collection importing and
  discovery, collection requests, and administrator-controlled AI
  recommendation conversations remain planned work.

### Verification

- Verified with linting, strict TypeScript checking, the full Vitest suite, and
  a production webpack build.

## [0.5.1] — Visibility and responsive browsing refinements

### Added

- Added administrator-controlled visibility for aggregate server statistics and
  shared recent activity, including live navigation updates for regular users.
- Added a per-user content-age limit backed by normalized provider ratings and
  enforced it across supported discovery, search, recommendations, and shared
  activity paths.
- Added a shared accessible segmented control for dashboard and Statistics
  views, plus reusable progressive “Show more” lists for request queues and
  upcoming followed titles.

### Changed

- Consolidated dashboard personal and shared recent activity into one compact,
  twelve-item view that defaults to shared activity only when it is permitted.
- Improved request, STRM import, request-history, and Following scalability by
  showing twelve items initially and loading more on demand.
- Refined mobile request cards so status and actions no longer crowd media
  information, and established a clearer responsive heading hierarchy across
  application, profile, discovery, and detail pages.

### Fixed

- Kept age-restricted titles non-navigable in shared recent activity and show a
  clear explanation instead.
- Corrected local version reporting to reflect the v0.5 release line.

### Verification

- Verified with linting, strict TypeScript checking, the full Vitest suite, a
  production webpack build, and desktop/mobile local UI checks.

## [0.4.2] — Jellyfin 12 synchronization

This release also includes the completed integration, notification, settings,
recommendation, request, statistics, and user-administration refinements
merged since v0.4.1.

### Added

- Added shared integration activity cards with consistent progress, completed,
  failed, and synchronization-log states.
- Added user-specific in-app notification preferences and clearer read/unread
  notification presentation. Notification navigation now marks an item read
  and closes the notification peek.
- Added richer administrator Statistics charts with Recharts, chart/table
  toggles, genre and title-type breakdowns, ratings, viewing-time heatmaps,
  tooltips, user filters, and per-user profile statistics.
- Added administrator controls to deactivate Cued access, revoke sessions,
  reorder users with drag-and-drop or keyboard-friendly move buttons, and keep
  inactive-user details collapsed.
- Added forward migration `0039_tense_nebula` for persisted Cued access state
  and user ordering.

### Changed

- Standardized primary button labels, loading states, integration actions,
  card footers, and responsive settings layouts across providers.
- Improved M3U Editor and Jellyfin refresh feedback, deduplicated refresh
  toasts, and moved toast dismissal to the top-right with desktop bottom-right
  placement.
- Improved recommendation hide/restore interactions with immediate loading
  and list updates, and made hidden recommendation titles inspectable.
- Improved request availability presentation, including available items that
  originated as STRM files and notifications when requested titles become
  available.
- Refined backup and portability controls, light-theme destructive button
  contrast, notification clearing versus marking as read, and settings-page
  organization.
- Added linked series names, season/episode numbers, and episode titles to
  recent activity in Statistics.

### Fixed

- Fixed `/api/jobs/status` failures and PostgreSQL enum comparisons on the
  Requests page.
- Fixed recommendation feedback persistence failures and request/recommendation
  action loading behavior.
- Fixed completed-title statistics counting undated Jellyfin played flags or
  states from libraries a user can no longer access. Viewing activity now
  requires a dated Jellyfin completion in an imported, accessible library.
- Fixed duplicate process-start notifications and missing notification
  delivery for completed request availability.
- Fixed statistics chart server-rendering errors caused by passing functions
  from Server Components to Client Components.

### Fixed

- Restored Jellyfin synchronization on Jellyfin 12 servers that return collections (`BoxSet` items) alongside requested media. Cued now ignores item types outside its supported media model while paging correctly through the full response.
- Fixed integration health updates after a failed sync by serializing failure timestamps safely for PostgreSQL.
- Recorded safe failure categories for manual and scheduled Jellyfin syncs without logging media data, credentials, URLs, or SQL values.

### Verification

- Verified against the configured Jellyfin 12 development server through library import and user-state synchronization, plus focused tests, linting, strict TypeScript checking, and a production build.

## [0.4.1] — Jellyfin 12 compatibility

### Fixed

- Restored Jellyfin connectivity for Jellyfin 12 by using its current MediaBrowser authorization header for API keys. This fixes connection testing, saving the Jellyfin integration, and scheduled synchronization.
- Allowed deployments that set a custom container user and group to write Next.js image-cache files, preventing repeated `/app/.next/cache` permission errors.
- Corrected episode and season watch-state synchronization, completion calculations, and latest-watch dates when Jellyfin libraries contain duplicate episode records or only report completed progress.
- Restored season links and artwork fallbacks in watch history.

### Upgrade notes

- No configuration changes are required. Keep any existing `user: UID:GID` setting in Docker Compose, then pull the updated image and recreate the Cued container.

### Verification

- Verified Jellyfin authorization behavior with focused client tests, linting, strict TypeScript checking, and a production build.

## [0.4.0] — Collections, seasons, and richer title details

This release contains all changes merged after v0.3.3, including the follow-up fixes completed while validating the new discovery and title-detail flows.

### Added

- Added TMDB collection detail pages with artwork, overview, member counts, compact synchronized cards, and collection follow support.
- Added collection previews and a clear “View collection” action to movie detail pages.
- Added detailed series season browsing with season artwork, episode artwork, summaries, air dates, and watched/unwatched state.
- Added watched dates and watched-state indicators for episodes, with matching based on Jellyfin series, season, and episode numbers.
- Added resilient artwork fallbacks for seasons and episodes when TMDB images are unavailable.
- Expanded person credit browsing with compact cards and improved role and credit filtering.

### Changed

- Synchronized title-card feedback actions across library, recommendations, collection, people, and related-title views.
- Feedback actions now reuse the title data already displayed on a card, improving reliability and avoiding unnecessary metadata lookups.
- Improved collection and title metadata refresh behavior so enhanced TMDB details are available when present.
- Updated the release pipeline to use Node.js 24-compatible Docker actions and cache multi-architecture builds.

### Fixed

- Fixed “More like this” and “Not interested” actions failing when optional form fields were absent or when cards were rendered outside recommendations.
- Fixed the start-page recommendation restore action so it uses a valid Server Action boundary in Next.js.
- Fixed stale or missing episode watch-state presentation and added localized watched-date copy in English, Swedish, and Dutch.

### Verification

- Verified with linting, strict TypeScript checking, the full Vitest suite, and a production build.
- The published release workflow builds and publishes tested `linux/amd64` and `linux/arm64` container images.

## [0.3.3] — Consistent discovery and responsive background work

### Added

- Added popular movie and series results to the Search page before a query is entered.
- Added responsive mobile search access from the application navigation and a clear-search control.
- Added denser discovery grids, responsive two-column mobile layouts, compact horizontal carousels, and a Library “Show more” flow.
- Added synchronized result counts, numbered pagination, loading skeletons, genre and rating filters, availability filtering, and sorting across discovery pages.
- Added Holiday, short-watch, unwatched, and highly rated viewing-intent options to Library browsing.
- Added shared More like this, Follow, Not interested, request, availability, rating, tooltip, and disabled-state behavior across media cards.
- Added shared page-introduction and filter-panel patterns across browsing, administration, and integration pages.
- Added Jellyfin synchronization totals to completion notifications, including libraries, titles, and users synchronized.

### Changed

- Standardized page heading sizes, filter ordering, collapsed-state behavior, action placement, submit labels, result counts, and responsive content widths.
- Improved title-detail browsing with synchronized related-media and people cards, bottom-aligned section controls, and horizontal scrolling.
- Changed persistent background progress feedback to dismissible, swipeable stacked toasts positioned away from mobile navigation.
- Manual Jellyfin and M3U Editor refreshes now run in the background so navigation remains available while work continues.
- M3U Editor refreshes are deduplicated in-process to avoid overlapping scans.
- Integration overview and provider settings now share the same page-introduction component while retaining their integration back links.

### Fixed

- Prevented mobile homepage overflow from oversized recent-activity titles and discovery cards.
- Prevented duplicate React keys in search results and kept filter state synchronized with URL parameters.
- Preserved filter panels when individual controls return to their defaults; only Clear collapses them.
- Corrected card action-footer sizing, alignment, dividers, button styling, rating-badge placement, and request loading states.
- Kept STRM/M3U controls hidden when the relevant integration or access is unavailable.
- Added localized fallback copy for historic Jellyfin notifications that predate synchronization totals.

### Verification

- CI verifies formatting, linting, strict type checking, tests, production builds, and Docker image builds for the release.

## [0.3.2] — Mobile discovery layout

### Fixed

- Search and Library now show two cards per row on mobile viewports, including the Search loading skeleton, while retaining responsive auto-fit layouts on larger screens

## [0.3.1] — Discovery and library refinements

### Added

- Responsive recommendation and discovery cards with compact media carousels, consistent action buttons, tooltips, follow controls, request loading states and toast feedback
- A denser Search experience with responsive results, synchronized numbered pagination, loading skeletons, clear-search controls, multi-select filters, rating and genre filters, and sorting options
- Denser responsive Library cards with source-aware rating badges and shared More like this, Not interested and Follow actions
- Combined Library filters, including multi-select genres and catalog-wide viewing options for Holiday, short watches, unwatched titles and highly rated titles

### Changed

- Library filter controls now match the Search experience and retain their expanded state until explicitly cleared
- Recommendation, Search, Library and title-card actions now share sizing, alignment, disabled and divider behavior

### Fixed

- Jellyfin user watch-state synchronization now refreshes correctly and avoids stale provider access assumptions
- AI profile refreshes and JSONB usage typing are restored and covered by repository tests
- Search and Library cards avoid duplicate React keys, keep filters in their URLs, and preserve consistent source-specific rating presentation

### Documentation and operations

- Updated the roadmap and contributor guidance to reflect shipped milestones
- Added CI checks and release automation for tested, versioned multi-architecture container images

## [0.3.0] — AI choice, library discovery and statistics

### Added

- OpenRouter as an alternative AI provider, with encrypted credentials, curated model choices, zero-data-retention routing, usage/cost tracking, and a configurable quiet period for recommendation refreshes
- A full Library page for browsing selected Jellyfin libraries, including search, genre, title type, availability, rating-provider, score, sort, and historical-item filters
- Normalized external ratings on title pages and in Library filters: Jellyfin community ratings, TMDB, and—when Radarr is configured—IMDb, Rotten Tomatoes, Metacritic, and Trakt
- Scheduled rating enrichment with on-demand refresh for stale title ratings
- Private user profiles with acquisition-request history and availability-derived completion status
- Temporary viewing-intent controls for tailoring the displayed recommendation inbox without changing a user's taste profile
- Admin statistics covering selected-library activity, most-watched titles, aggregate ratings, and recent viewing
- Private viewing and rating summaries on user profiles
- GitHub bug-report and feature-request forms with automatic `needs-triage` labeling
- Contributor and pull-request guidance for collaborators
- Docker image verification, formatting checks, and Prettier formatting in continuous integration
- Automatic multi-architecture `experimental` images for tested `develop` branch revisions

### Fixed

- Statistics now exclude archived items and libraries that administrators have not selected
- Recent activity queries use unambiguous title aliases
- Most-watched rankings deduplicate the same logical title across selected Jellyfin libraries

### Upgrade notes

- This release includes database migrations for recommendation refresh batching, historical-library indexing, and cached external ratings. Docker installations apply them automatically at startup; source installations should run `pnpm db:migrate` before starting the application.

## [0.2.0] — Automation, notifications and unified media experience

### Added

- Configurable automatic Jellyfin and M3U Editor scan schedules for administrators
- Private in-app notification inbox with completion and failure notifications
- Portable user data import/export and full-installation backup/restore
- General TMDB discovery for new users before enough taste signals are available
- Shared media cards with availability badges, feedback actions and request controls across recommendations, search and people pages
- React Aria dialogs, tooltips and popovers with accessible keyboard and viewport behavior

### Changed

- Recommendation and AI-profile progress now use a consistent top-right toast experience
- Availability states consistently distinguish library, STRM and pending STRM titles
- People-page filters update without a browser page reload, and title detail heroes have an integrated Back control
- User language selection is retained across sign-in and the dashboard greeting follows local time

### Upgrade notes

- Run the bundled database migration before starting the new version: `pnpm db:migrate`.
- Full restores require the same `CUED_ENCRYPTION_KEY` to reuse encrypted integration credentials.

## [0.1.1] — M3U Editor and STRM improvements

### Changed

- Simplified Docker Compose installation around two required secrets and sensible defaults
- Added configurable container UID/GID values so STRM files can retain existing host ownership
- Made Compose fail early when the database password or encryption key is missing
- Publish native `amd64` and `arm64` container images under the same release tags

### Fixed

- Fresh users without watch or rating signals no longer receive a failed recommendation refresh warning
- M3U Editor STRM files no longer embed Xtream credentials; playback uses the selected playlist UUID instead
- M3U Editor now retains discovered playlist names after saving the integration
- STRM requests now visibly wait for Jellyfin and update automatically when the library scan discovers the title
- Recommendation refresh now enforces one running run per user at the database level, closing a check-then-insert race
- Notification deliveries are now atomically claimed before sending, preventing duplicate delivery under concurrent dispatch

## [0.1.0] — Initial public release

Initial public release of Cued, a self-hosted media discovery and recommendation application.

### Included

- Jellyfin integration with full and incremental synchronization
- Per-user Jellyfin library access and watch history
- TMDB search, metadata, posters, people, cast, crew, and trailers
- Ratings, feedback, tags, exclusions, and date/time preferences
- Persistent personalized recommendations
- Optional AI-enhanced recommendations with configurable profiles
- Radarr and Sonarr request integration
- Per-user request approval policies
- Following movies, series, and people
- Notifications through configurable ntfy servers
- M3U Editor integration with multiple source variants and group selection
- Jellyfin-ready STRM file generation with optional automatic library refresh
- Background synchronization after STRM creation
- Docker Compose deployment with PostgreSQL persistence
- Versioned GHCR container publishing

### Container image

```text
ghcr.io/cuedapp/cued:0.1.0
```

The `latest` tag is also published. Pin the version tag or image digest for reproducible deployments.

### Upgrade notes

Back up the PostgreSQL volume and `CUED_ENCRYPTION_KEY` before upgrading. Database migrations run automatically when the container starts.
