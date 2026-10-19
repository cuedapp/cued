# Cued glossary

Shared meanings for contributors and agents. Use these definitions when interpreting requests and reporting progress.

Delivery and versioning definitions below were agreed with the project owner. Product definitions consolidate the existing product and implementation documentation. This file defines language; it does not replace detailed procedures or claim that planned features exist.

## Using and maintaining this glossary

- Read this file before interpreting release requests or using project-specific terms.
- A definition is not an instruction to perform an action. Discussing a release does not authorize publishing one.
- Use the precise terms below rather than treating implementation, publication and deployment as synonyms.
- If a request or the implementation conflicts with a definition, surface the conflict. Do not silently redefine the term.
- Record newly agreed meanings here. Keep unresolved proposals out of the agreed definitions until the project owner settles them.
- Follow the [documentation routing map](AGENTS.md#documentation-routing) when choosing where to record an agreement or change. Procedures belong in the [development guide](docs/DEVELOPMENT.md), not in these definitions.

## Work and delivery

### Done

The requested behavior is implemented and verified, and relevant documentation is updated. Report the verification actually performed and any blockers. Done does **not** imply that changes have been committed, pushed, integrated, released or deployed.

### Shipped

A change is included in a successfully published stable release. A local implementation, a merge to `develop`, or an experimental image is not shipped in this sense. Shipped does not mean every installation has been upgraded.

### Milestone

A bounded set of requirements and acceptance criteria in the roadmap. A milestone must be functional and verified before work begins on the next one. A milestone is not a version number: releases can contain fixes outside a new milestone, and the terms are not interchangeable.

### Approved scope

Work explicitly authorized by the project owner. Recording an idea as a future feature or candidate in the roadmap does not approve implementation. This glossary does not approve any new milestone.

### Prepare a release

Make the version, changelog, release notes and release pull request or draft ready for review. Preparation alone does not include publishing the GitHub Release or deploying an image. Report where preparation stopped rather than saying the release was created.

### Create a release

Complete stable release publication end to end, including verification that the versioned container images and stable `latest` tag were successfully published. Publishing only the GitHub Release is insufficient if container publication failed. Creating a release does **not** include upgrading a running installation.

Follow the [release process](docs/DEVELOPMENT.md#release-process); existing review requirements and branch protections still apply.

### Stable release

A non-prerelease GitHub Release from the stable-release branch, with successful verification and publication of its versioned images. It updates `ghcr.io/cuedapp/cued:latest`. Stable identifies the release channel; it does not guarantee that the software has no defects.

### Experimental build

A verified integration build from `develop`, published for testing under `ghcr.io/cuedapp/cued:experimental` and its commit-specific image tag. It does not create a GitHub Release or update `latest`, and is not a production release. It can include database migrations.

### Prerelease

A GitHub Release marked as a prerelease rather than a stable release. A prerelease does not update `latest` and does not count as shipped under this glossary. The current tag-format constraint is documented in the [release process](docs/DEVELOPMENT.md#release-process).

### Version, Git tag, image tag and digest

A **version** identifies a numbered release, for example `0.8.6`. Its **Git tag** identifies the source revision as `v0.8.6`; its versioned **image tag** is `ghcr.io/cuedapp/cued:0.8.6`. Versioned release tags are treated as immutable. `latest` and `experimental` are mutable image tags, not fixed version identifiers. An **image digest** identifies a specific published image independently of mutable tags.

### Patch, minor and major release

Choose the bump from the changes since the previous release, not from whether a milestone was completed:

- **Patch:** backward-compatible fixes; increment PATCH.
- **Minor:** backward-compatible features; increment MINOR and reset PATCH.
- **Before 1.0:** breaking changes require a minor bump and explicit upgrade notes, not a patch bump.
- **From 1.0:** breaking changes require a major bump, resetting MINOR and PATCH.
- **1.0:** an explicit project-owner stability decision, not an automatic consequence of a breaking change during 0.x development.

For example, from `0.8.6`, compatible fixes lead to `0.8.7`; compatible features or pre-1.0 breaking changes lead to `0.9.0`. Breaking changes must be called out, not hidden in a version bump.

### Deployment

Running a selected application image in a particular installation. Publishing an image is not deployment. A deployment needs an identified target; a request to create a release does not authorize changing that target. Cued does not update its own container.

### Upgrade

Moving an existing installation to a newer application version, including the applicable database migrations and operator steps. Follow the documented backup and upgrade guidance. Release publication alone does not upgrade an installation.

### Rollback

Returning an installation to an earlier application image. This does not reverse database migrations. See the [operator rollback guidance](README.md#updating-rollback-and-operating) for backup and schema-compatibility requirements.

Delivery references: [release procedure](docs/DEVELOPMENT.md#release-process), [implemented release automation](docs/ARCHITECTURE.md#releases-and-operations), and [operator upgrade guidance](README.md#updating-rollback-and-operating).

## Product language

### Cued

A self-hosted media discovery and recommendation application above an operator's existing media stack. It is not a media server, player, download manager or content-distribution service. Operators configure their own integrations and media sources.

### Title

A movie or series, distinct from a person, collection, season or episode. The same title can appear in discovery, recommendations, a Jellyfin library and acquisition providers; those appearances do not make it different titles. Media type matters when identifying a title by a provider ID.

### Library and in-library

A **Jellyfin library** is a configured media-server library. Cued's **Library** is the synchronized catalogue visible to the signed-in user within the selected libraries, including historical removed entries when requested.

**In-library** means a title currently has a matching entry in a selected Jellyfin library the user can access. An accessible STRM entry counts; an M3U Editor offer without a Jellyfin entry does not. A historical removed entry is not current membership. In-library does not by itself prove that a local media file exists or that playback will succeed.

### Discovery catalogue

The broader universe of titles Cued can find through TMDB, rather than only the user's Jellyfin library. A discovery result is not automatically a personalized recommendation, available media or an acquisition request.

### Recommendation

A title suggested to a particular user by Cued's recommendation pipeline, with stored ranking and recommendation state. Recommendations can be outside the user's library and do not require AI. General discovery results are not all personalized recommendations.

### Taste profile

The user's longer-term preference model, informed by watch history, ratings and feedback. It is distinct from temporary viewing intent. Optional AI can enrich the model; the term does not imply that AI is enabled.

### Viewing intent

What the user wants to watch right now, such as a light movie tonight. It temporarily influences suggestions without permanently changing the user's taste profile.

### Follow

A user's choice to monitor a movie, series or person for relevant changes. Following is not an acquisition request and does not by itself add content to a provider or make it available.

### Acquisition and acquisition request

**Acquisition** is obtaining access to a title through an operator-configured source, such as requesting a downloaded copy through Radarr/Sonarr or creating STRM pointers from M3U Editor offers. Cued coordinates these actions; it does not supply the media content.

An **acquisition request** asks for such an action. A request can need administrator approval or fail. For Radarr/Sonarr, approved/requested means the provider request has been accepted, not that the content has finished downloading or appeared in Jellyfin. Creating STRM files can likewise precede Jellyfin importing them. Always distinguish request progress from availability.

### Requestable

Cued can offer an acquisition action for a title given the configured provider, permissions and current title/request state. Requestable does not mean already requested, approved, acquired or playable.

### Availability

The source-specific state of access or an offer for a title. State must be interpreted in the signed-in user's library-access context. Prefer explicit labels such as Jellyfin, STRM or M3U Editor instead of an unqualified claim that a title is available.

Availability and acquisition are separate: an M3U Editor offer or STRM entry does not remove the option to request a downloaded copy through Radarr/Sonarr. A series entry or source offer also does not establish that every episode is available.

### STRM

A pointer file containing a playback URL, not a downloaded media file. Jellyfin uses the pointer to stream from the configured source. Writing a STRM file, importing it into Jellyfin and successfully playing it are distinct events. Playback URLs can contain secrets and must be handled as private data.

Product references: [product vision and vocabulary](docs/PRODUCT.md), [implemented behavior](docs/ARCHITECTURE.md), and [operator documentation](README.md).
