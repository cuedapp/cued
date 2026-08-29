# Changelog

All notable Cued releases are documented here. GitHub Release descriptions should include the matching section from this file.

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
