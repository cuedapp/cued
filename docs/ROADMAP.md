# Cued Development Roadmap

This document owns current and future milestone scope, acceptance criteria, candidate proposals and delivery status. The roadmap is intentionally incremental: each approved milestone should be functional and verified before starting the next. A recorded candidate is not implementation approval. Completed and shipped milestones and superseded proposals live in [ROADMAP-HISTORY.md](ROADMAP-HISTORY.md).

Use the [glossary](../GLOSSARY.md) for done/shipped and milestone meanings, [PRODUCT.md](PRODUCT.md) for product intent, and [ARCHITECTURE.md](ARCHITECTURE.md) plus the implementation for current behavior. Contributor and release procedures belong in [DEVELOPMENT.md](DEVELOPMENT.md), not in milestone checklists. See [document routing](../AGENTS.md#documentation-routing) for ownership.

## Current focus

Milestones [1–21](ROADMAP-HISTORY.md) are shipped. Milestone 22 — Private watchlists and named lists —
is approved and next. Ten further features are approved but not yet scheduled;
see the [approved roadmap](#approved-roadmap) for scope and remaining questions.

## Approved roadmap

**Approval:** The project owner approved the eleven user and administrator
features below on 2026-10-13. This is approval of their stated feature scope,
not a claim that they are implemented or shipped. Questions remain explicitly
open; approval does not silently settle proposed defaults or provider behavior.
Resolve a question before implementing the behavior it governs. Questions that
change scope, privacy or destructive behavior require an owner decision; verify
provider/API facts against the provider before implementation.

Milestone 22 is the next implementation scope. The remaining ten approved
features are not yet scheduled or assigned milestone numbers; do not start them
as part of Milestone 22. Their delivery order and bounded milestone acceptance
criteria remain to be settled before implementation starts. Existing candidates
outside these eleven features remain unapproved.

### Milestone 22 — Private watchlists and named lists

**Status:** Approved; next milestone; not implemented.

Goal: let users keep discoveries for later without having to follow release
updates or request acquisition.

Scope and acceptance criteria:

- Each user has a private Watch later list and can create, rename and delete
  named lists containing movies or series from accessible libraries or discovery.
- Users can add and remove titles, and list membership survives reloads and sign-in.
- List views show the viewer's current watched and availability states, including
  truthful available, unavailable or unknown STRM state.
- Saving a title does not follow it, request it, rate it or alter the user's taste
  profile. These remain separate explicit actions.
- Lists and their mutations are private to their owner. Every read and action
  preserves current library-access and content-rating limits; saved membership
  cannot reveal otherwise inaccessible Jellyfin items.
- Controls and loading, empty, success and error states are localized in English,
  Swedish and Dutch and reuse shared card/action conventions.

Agreed product decisions (confirmed by the project owner on 2026-10-13):

**List management and membership**

- Watch later is permanent and cannot be renamed or deleted. Named-list names
  are trimmed, contain 1–100 characters, and are case-insensitively unique within
  the owner's lists; the built-in Watch later name is reserved. User-authored
  names are plain text and are not translated.
- Watch later appears first; named lists appear alphabetically. There are no
  fixed product quotas on list count or membership size; loading and rendering
  must remain bounded rather than fetching an entire collection at once.
- A title may belong to several lists, once per list. Adding an existing member
  does not duplicate it or change its added date. Removing and later re-adding
  it gives it a new added date. Watching a title never automatically removes it.
- Deleting a named list removes only that list and its memberships, not titles,
  memberships in other lists, follows, requests or feedback.

**Ordering**

- Each list offers added date newest/oldest, title A–Z/Z–A, unwatched-first and
  available-first sorting. Remember the selection per list across visits; the
  default is newest-added. Manual ordering is not supported.
- State-aware sorting uses the viewer's current watched and availability data.
  Unknown availability must not count as available.

**Save actions and browsing**

- A dedicated Lists destination in desktop and mobile navigation contains Watch
  later and named lists. It is distinct from existing Jellyfin/TMDB Collections.
- Expose Save on movie/series cards in Library, Search, Explore/Seasonal and
  Recommendations, including their shared-card consumers: dashboard carousels,
  related titles, person filmographies, collection members, Following and
  assistant results. Also expose it on movie/series detail pages and list cards.
  Library movies/series remain saveable without TMDB IDs.
- Do not add bespoke save controls to activity feeds, watching-now displays or
  episode/season rows. People, collections, seasons and episodes are not save
  targets.
- Save opens one destination picker showing independent memberships in Watch
  later and named lists, with named-list creation available there. Adding or
  removing membership affects only the selected list.

**Availability, restrictions and missing metadata**

- A permitted TMDB title remains visible even without an accessible Jellyfin
  copy. Losing library access or availability alone does not hide its permitted
  TMDB metadata. Never disclose a denied Jellyfin match, its metadata or watched
  state, or imply that it provides availability for the viewer.
- Genuinely restricted entries retain membership internally but are omitted
  from cards, visible counts and personal exports. This includes titles above
  the current content-rating limit and library-only titles whose source is no
  longer accessible. Visibility returns when permitted again.
- When metadata disappears or cannot be fetched, preserve membership and show
  the last-known display snapshot, marked metadata unavailable, only when
  current restrictions still permit it. Without a safe snapshot, show a generic
  removable entry without identifying metadata or links. Never use stale
  Jellyfin metadata after access is lost, or fabricate watched/availability state.

**Export, import and installation backups**

- Personal export/import includes named-list names, Watch later and named-list
  membership, title identities, added dates and selected sort settings. Manual
  order does not exist. Watched and availability snapshots are not portable
  authoritative state; resolve those states for the receiving viewer.
- Import TMDB entries by movie/series plus TMDB ID without requiring a receiving
  Jellyfin copy, while preserving current content restrictions. Library-only
  entries are included in exports, but unresolvable entries without TMDB IDs are
  skipped and explicitly reported on import. Preserve their lists and other
  members. Do not guess matches from title text or add a matching interface.
- Import merges named lists using the agreed case-insensitive name rule and
  merges Watch later into the built-in Watch later list. Deduplicate membership;
  remove nothing already saved. Existing memberships retain their added dates
  and existing lists retain their sort settings. New lists restore exported
  dates and sorting; newly imported memberships restore their exported dates.
  Re-importing the same file must not create duplicate lists or memberships.
- Full installation backup/restore preserves all new durable list state. This
  does not add administrator access to another user's list browsing or mutations.

### Recently Added from Jellyfin (approved; not yet scheduled)

Goal: show what has recently appeared in Jellyfin while making STRM availability
clear rather than implying that every catalogue entry is playable.

Requirements:

| ID  | Requirement                                                                                                                                              | Priority  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R0  | Order recent items by Jellyfin's added timestamp, not premiere date or Cued's local row-creation time.                                                   | Must-have |
| R1  | Show a dashboard preview and a full browse page while preserving selected-library, per-user-access, content-rating and removed-item rules.               | Must-have |
| R2  | Show STRM availability as available, unavailable or unknown using M3U Editor data; Jellyfin catalogue presence alone does not prove source availability. | Must-have |

This requires carrying Jellyfin's addition timestamp through synchronization and
persistence; do not substitute a local sync/insert timestamp when the provider
does not supply one.

Remaining questions:

- How should items without a Jellyfin-added timestamp be presented or excluded
  without substituting local timestamps?
- What is the recent window and pagination/order policy, including equal timestamps?
- How should multiple accessible copies and re-added titles affect the feed?

### Manual seen/unseen controls (approved; not yet scheduled)

Goal: let each user explicitly mark movies, series and individual episodes seen
or unseen, including content watched elsewhere rather than through Jellyfin.

The feature scope is approved. Resolve the questions below before implementing
the affected behavior; no milestone number has been assigned.

| ID  | Requirement                                                                                                                                                                                              | Priority  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R0  | Provide seen/unseen actions for movies, series and individual episodes, both in accessible Jellyfin libraries and in discovery; individual discovery episode controls cover released episodes.           | Must-have |
| R1  | Actions change only the signed-in user's watch state and preserve existing library-access and content-rating boundaries.                                                                                 | Must-have |
| R2  | For a matching accessible Jellyfin item, write the change to that user's Jellyfin watch state and reflect the resulting state in Cued.                                                                   | Must-have |
| R3  | For items without an accessible Jellyfin match, persist local Cued watch state that ordinary Jellyfin synchronization cannot erase.                                                                      | Must-have |
| R4  | A whole-series action updates its released regular episodes, with confirmation of the affected episode count; derive series completion from those episode states rather than an independent series flag. | Must-have |
| R5  | Marking a movie or episode unseen clears completion and resets resume progress; a series unseen action applies this to its affected episodes.                                                            | Must-have |
| R6  | When a locally marked item gains an accessible Jellyfin match with conflicting watch state, use Jellyfin's state until the user explicitly chooses whether to apply the earlier Cued mark.               | Must-have |

Series and synchronization boundaries:

- Series actions exclude specials and future episodes. Specials remain separate
  from regular-series completion and can be marked individually. Marking a series
  seen must not pre-mark future episodes; newly released episodes can make the
  series incomplete again.
- Discovery episodes also support individual local marks, not only a bulk
  whole-series flag. Episode identity and completion must remain consistent when
  matching Jellyfin items become accessible.
- Do not automatically overwrite existing Jellyfin watch progress with an older
  local seen/unseen mark. Preserve the pending local choice for conflict review.
- Local state for content outside accessible libraries must not grant access to
  otherwise inaccessible Jellyfin items or another user's watch state.

Proposed default (not yet agreed):

- Preserve explicit ratings and written feedback when marking unseen; resetting
  completion/progress does not mean deleting those separate preference signals.

Remaining questions and provider verification:

- Verify Jellyfin's per-user watched/unwatched writes, resume-position reset
  behavior, and series/episode aggregation rather than assuming provider semantics.
- Define truthful handling of failed or partially successful series changes,
  including which affected episodes remain changed and how failures are shown.
- Define matching when a title or episode has several accessible Jellyfin copies,
  and how discovery episodes map to provider items without changing inaccessible
  copies.
- Define conflict detection and review when completion agrees but existing resume
  progress differs, and how pending conflicts survive synchronization and reloads.
- Decide which timestamps and play-count/history fields a manual seen action
  changes; do not silently treat a manual mark as a measured playback session.
- Choose action entry points and the discovery episode UI, and define how watch
  history, filters and recommendations reflect a successful change.

### Notification digests and quiet hours (approved; not yet scheduled)

Goal: make existing notifications useful without unnecessarily interrupting users.

Scope:

- Let each user choose daily or weekly summaries of newly available followed
  titles, upcoming episodes and selected recommendations, with delivery times.
- Add user-controlled quiet hours and reuse existing event visibility, preferences
  and deduplicated delivery behavior.
- Keep urgent administrator failures under separate controls rather than treating
  them as ordinary discovery messages.

Remaining questions:

- Which existing channels support digests, and which events remain immediate?
- How do time zones, daylight-saving changes, missed schedules and duplicate
  prevention affect delivery?
- What happens to queued events when users change preferences or permissions?
- Which administrator events may bypass quiet hours, and who opts into that?

### Opt-in group watch picker (approved; not yet scheduled)

Goal: help selected users agree on a title without exposing their private activity.

Scope:

- Participants explicitly opt in, choose temporary viewing constraints and receive
  a small shortlist of mutually suitable titles.
- Enforce every participant's library-access and content-rating limits; shared
  results must not reveal denied library membership or private taste signals.
- Keep individual ratings, watch history and preference explanations private.
- Keep group choices separate from lasting profiles and from personal
  recommendation/message threads; voting is an optional design choice, not an
  approved requirement.

Remaining questions:

- How are participants invited, consent recorded and participation withdrawn?
- Should groups persist or be single-use, and should participants vote?
- Is the default scope mutually available library titles or broader discovery?
- How should conflicting constraints and an empty eligible shortlist be handled?
- What signals may influence the shared ranking, and what aggregate explanation
  can be shown without revealing individual preferences?

### Correctable recommendation preferences (approved; not yet scheduled)

Goal: turn existing recommendation explanations into actionable user control.

Scope:

- Extend existing reasons and feedback with explicit controls to reduce a genre's
  influence or exclude a watched title from representing the user's taste.
- Explain the effect of a correction and let the user review and reverse it.
- Keep corrections separate from watch-state changes, ratings, ordinary hidden
  recommendations and temporary viewing intent; remain useful without AI.

Remaining questions:

- Which correction controls and influence levels should users receive?
- How do corrections interact with existing ratings, feedback, deterministic
  scoring and optional AI profiles?
- When do corrections affect existing recommendations versus future refreshes?
- How are corrections represented in portable user export/import?

### Ready to binge browsing (approved; not yet scheduled)

Goal: let users find series that meet their expectations for a complete binge.

Scope:

- Distinguish a series whose run has ended from a series with all released regular
  episodes currently available to the viewer; expose filters for those facts.
- Use current access-controlled episode coverage and existing STRM source state.
- Represent missing or uncertain coverage as missing or unknown, never as proof
  of completeness or playability.

Remaining questions:

- Which provider status establishes an ended series, including cancelled series?
- Do availability filters include STRM titles, and how is unknown source coverage
  represented?
- How are specials, regional release dates, multiple copies and stale metadata
  handled when calculating coverage?

### Actionable diagnostics overview (approved; not yet scheduled)

Goal: help administrators explain stale or missing application information.

Scope:

- Extend existing integration health and durable job state with last successful
  refresh, data freshness, affected functionality and concrete recovery guidance.
- Link to existing integration and job controls instead of duplicating them.
- Keep diagnostics administrator-only and exclude secrets, tokens, connection
  strings and user-private media data from diagnostic output.

Remaining questions:

- Which integrations and jobs appear, and what defines stale data when schedules
  differ or are disabled?
- Which recovery actions are safe to offer, and which need confirmation?
- Should there be a redacted support export, and what may it contain?

### Availability and request explanations (approved; not yet scheduled)

Goal: make acquisition states and the next action understandable to users and admins.

Scope:

- Explain available, unavailable, unknown, awaiting approval, already requested
  and waiting-for-Jellyfin states using existing persisted state and provider facts.
- Before submission, explain the proposed acquisition source, or make clear that
  an administrator will choose it during approval.
- Reuse existing permission, approval and duplicate-request rules. Do not equate
  catalogue presence with source availability or promise successful playback.
- Provide consistent explanations on shared cards, title details and request
  history, with administrator troubleshooting context where appropriate.

Remaining questions:

- How are conflicting or stale provider states prioritized and explained?
- Which source/destination details may regular users see under existing permissions?
- What acquisition choices may users change before submission, and should this
  scope change routing behavior or only explain the existing behavior?

### Scheduled backups with retention (approved; not yet scheduled)

Goal: reduce reliance on administrators remembering manual database exports.

Scope:

- Extend existing full backup/restore with scheduled archives, configurable
  retention, last-success state and failure notifications.
- Make archive storage administrator-controlled and preserve secret/access
  protection; retain the existing explicit confirmation for destructive restore.
- Explain encryption-key recovery and off-host storage: an archive on the same
  disk is not adequate protection against host or disk loss.

Remaining questions:

- Which destinations are supported, and is off-host transfer application-managed
  or an operator task?
- What schedule, retention limits and permissions should apply to stored archives?
- How is archive validity checked, and how are interrupted writes or storage
  exhaustion handled without deleting the last usable backup?
- How is the encryption key backed up separately and restore compatibility shown?
- Should administrators receive periodic restore-drill guidance?

### Metadata matching review (approved; evidence-gated; not yet scheduled)

Goal: improve matching when real installations demonstrate unmatched or ambiguous
Jellyfin-to-TMDB titles. Confirm that need before assigning implementation priority.

Scope:

- Surface unmatched or ambiguous mappings with evidence for administrator review.
- Provide reviewed corrections that remain stable across ordinary synchronization.
- Keep availability, discovery and collection matching consistent after correction;
  do not automatically substitute an uncertain identity.

Remaining questions:

- Which observed installation problems justify this work and establish acceptance
  examples?
- Which evidence and candidate sources can support review without inventing matches?
- What is the correction scope for multiple copies, and how can admins undo it?
- Which dependent records and caches need reconciliation without reassigning user
  feedback or watch state to the wrong title?

## Deferred maintenance

### Global ordering across discovery pagination

**Status:** Recorded follow-up; not scheduled and not part of Milestone 22.
The project owner agreed on 2026-10-13 to defer this existing limitation rather
than block [PR #64](https://github.com/cuedapp/cued/pull/64).

Goal: make a selected catalogue sort apply across combined movie and series
results before pagination, rather than only across provider pages already loaded.

- Cover Explore Upcoming and Seasonal All titles/Upcoming when media type is All.
  Each provider feed is currently paginated independently; sorting the combined
  loaded results can reveal a higher-ranked title only after Show more.
- Preserve library-access and content-rating boundaries, selected filters and
  sorting across incremental loading and reloads.
- Define independent feed cursors and deterministic tie handling before choosing
  an implementation; avoid duplicate or skipped titles across page boundaries.
- Verify asymmetric movie/series distributions for rating, popularity and
  release-date ordering, plus single-media browsing. Keep default Trending
  provider rank distinct from catalogue sorting.

## Unapproved candidates

The approval above does not include the proposals below. They remain candidates
for later prioritization, not implementation scope.

### Personal recommendations (candidate; not approved)

Goal: let existing Cued users recommend a movie or series to other users on the
same Cued instance and discuss that title in a private, fixed-participant group
thread. This is not general-purpose chat or a server-wide messageboard.

These choices were agreed with the project owner for this candidate. Recording
them does not approve implementation or assign a milestone.

| ID  | Requirement                                                                                                                                   | Priority  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R0  | A user can send a movie or series with a personal note to one or more selected users.                                                         | Candidate |
| R1  | The sender and selected recipients share one title-based thread, see its participants and can reply together.                                 | Candidate |
| R2  | Participants are fixed when the recommendation is sent; a different audience requires a separate thread.                                      | Candidate |
| R3  | All existing Cued users participate by default, with an opt-out; this does not automatically enroll every Jellyfin account.                   | Candidate |
| R4  | Users can leave or mute individual threads. User blocking is excluded from this candidate.                                                    | Candidate |
| R5  | Only participants normally read a thread. Admins can read reported content and relevant context for moderation, not browse all conversations. | Candidate |

Privacy and safety boundaries:

- Shared title discussions must preserve existing per-user library-access and
  content-rating boundaries; participation must not automatically expose another
  user's watch history, ratings or library permissions.
- Private means access-controlled within Cued, not end-to-end encrypted. The
  self-hosted instance operator can still access its database.
- Leaving or muting does not prevent another user from sending a new
  recommendation. With no blocking feature, global opt-out is the recipient
  control for stopping further participation; reporting alone does not prevent
  new messages.

Proposed defaults (not yet agreed):

- Text-only recommendation notes and replies; no attachments.
- Reuse each user's existing notification preferences, with per-thread muting.
- Receiving a recommendation does not automatically follow, request or rate the
  title, or change the recipient's recommendation/taste profile.

Open decisions before implementation approval:

- Spoiler handling for the initial note and replies.
- Whether leaving retains access to earlier messages, whether rejoining is
  allowed, and how departure is shown to the remaining participants.
- How global opt-out affects existing threads, history access and discoverability.
- Which conversation context a report exposes to admins and which moderation
  actions they can take.
- Message editing/deletion and retention, including what happens when an account
  is removed.

### Other directions (unapproved and not yet sequenced)

1. Documentation and project site
2. Additional providers
3. Jellyfin companion plugin

### Additional future considerations

These ideas are recorded for later prioritization and are not approved milestone
scope yet.

- **Cinematic single-session watching now.** When exactly one playback session
  is visible, consider a backdrop-led hero with the title, a restrained live
  indicator, and playback progress. Keep the existing compact session-grid
  pattern for multiple simultaneous sessions, and retain privacy and
  content-guidance rules in both presentations.
- **Provider choice beyond the initial stack.** Add carefully isolated
  alternatives where they materially improve a self-hosted setup: Plex, Emby
  or Trakt for watch history; Ollama, Anthropic or Gemini for AI; and email,
  Discord, Gotify or web push for notifications. Each addition should preserve
  Cued's existing privacy controls and work without requiring it.
- **Richer availability sources and acquisition routing.** The explanation
  improvements are [approved above](#availability-and-request-explanations-approved-not-yet-scheduled).
  New availability providers and changes to automatic source selection remain
  unapproved; do not infer them from the approved explanation scope.
- **Jellyfin companion plugin.** Consider a separately maintained Jellyfin
  plugin that turns a user's available Cued recommendations into refreshed,
  per-user Jellyfin playlists or collections. It could later ingest ratings
  made in Jellyfin and offer a Cued rating action in Jellyfin Web, while keeping
  Cued as the recommendation and rating source of truth. Start with existing,
  playable library titles rather than a fragile virtual library of unavailable
  media.
- **Shared taste and server discovery.** Consider opt-in, privacy-aware ways
  to surface compatible tastes, shared watch lists, and useful aggregate
  trends without exposing an individual's viewing history by default.
  The [group watch picker](#opt-in-group-watch-picker-approved-not-yet-scheduled)
  is approved above; broader social discovery and shared lists remain candidates.
  [Personal recommendation threads](#personal-recommendations-candidate-not-approved)
  are scoped separately and remain unapproved.
- **Documentation and project home.** Build a small static product and
  documentation site with installation guidance, integration setup,
  screenshots, release notes and a clear self-hosting story. Keep it separate
  from the application repository when it needs its own publishing lifecycle.
- **Reliable releases and contributor experience.** Continue hardening CI,
  container publishing and release verification, and add lightweight
  contributor tooling and guidance that make local development and supported
  demo data straightforward.

---

### Future possibilities

Unapproved candidate items:

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
