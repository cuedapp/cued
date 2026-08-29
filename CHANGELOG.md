# Changelog

All notable Cued releases are documented here. GitHub Release descriptions should include the matching section from this file.

## Unreleased

### Changed

- Simplified Docker Compose installation around two required secrets and sensible defaults
- Added configurable container UID/GID values so STRM files can retain existing host ownership
- Made Compose fail early when the database password or encryption key is missing
- Publish native `amd64` and `arm64` container images under the same release tags

### Fixed

- Fresh users without watch or rating signals no longer receive a failed recommendation refresh warning
- M3U Editor STRM files no longer embed IPTV credentials; playback is served through a signed, credential-free proxy
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
