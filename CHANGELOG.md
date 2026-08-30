# Changelog

All notable Cued releases are documented here. GitHub Release descriptions should include the matching section from this file.

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
