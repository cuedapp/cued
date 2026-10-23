# Issue tracker: GitHub

User-submitted bug reports and feature requests live in GitHub Issues for `cuedapp/cued`.
Internal, approved roadmap work lives separately in the [Cued Roadmap Project](https://github.com/orgs/cuedapp/projects/2).
Do not create a parallel local Markdown tracker.

## Conventions

- Before creating tickets, check existing issues and discussion for duplicates.
- In OMP, prefer `issue://cuedapp/cued/<number>` and
  `pr://cuedapp/cued/<number>` for reads; use search/listing tools as available.
  Use `gh` when a required operation is not available through OMP tools.
- Scope CLI operations explicitly with `--repo cuedapp/cued`.
- Read an issue with `gh issue view <number> --repo cuedapp/cued --comments`.
- Create an approved user report or feature-request issue with `gh issue create --repo cuedapp/cued --title "..." --body-file <file>`.
- Comment, edit or close issues only when the current task authorizes it.
- Keep secrets, connection strings and user-private media data out of tickets.

## Roadmap, features and tasks

- Use the [Cued Roadmap Project](https://github.com/orgs/cuedapp/projects/2) for internal planning and delivery of approved features.
- Represent approved roadmap features and their implementation slices as project-only draft cards. Keep them separate from user-submitted GitHub issues; do not add user requests to the Project, and never convert internal cards into GitHub issues.
- Keep `docs/ROADMAP.md` authoritative for feature scope, milestone assignment
  and delivery status. Track roadmap milestone grouping in the Project with a
  custom field; GitHub's repository milestones remain for user issues and pull requests.
- A Project field or status does not approve scope, resolve roadmap questions or establish shipment.
- `docs/ROADMAP.md` owns current and future feature goals, approved scope, milestone
  sequencing, remaining product questions and current delivery status.
- `docs/ROADMAP-HISTORY.md` owns completed and shipped milestone records and
  superseded proposals, preserving their recorded status and release information.
- A user issue owns its submitted report or feature request and its public discussion; it is not the internal implementation record.
- Internal feature breakdown and progress live in separate Project-only draft cards, while `docs/ROADMAP.md` owns approved scope and acceptance criteria.
- Creating or classifying an issue does not approve additional scope or resolve
  an open product question. Resolve questions that gate a slice before starting it,
  and implement only the currently approved milestone.
- Mark internal Project cards Done when their acceptance criteria are implemented
  and verified. Done means complete, not shipped; record actual shipment in
  `docs/ROADMAP-HISTORY.md` and update the current roadmap summary separately
  under Cued's glossary meanings.

## Publishing and dependencies

When a skill says "publish to the issue tracker", first draft and review the
proposed work locally in the current OMP session. This publication gate applies
to `/to-spec` and `/to-tickets`, including skills whose default flow publishes
immediately. After the user approves internal roadmap work, publish each approved
spec or implementation slice as a project-only draft card in the Cued Roadmap
Project, in dependency order, with `Blocked by: <card title>` in the body where
needed. For internal work, `/to-spec` and `/to-tickets` MUST NOT create GitHub
issues or sub-issues, apply issue labels, or convert project cards into issues.
GitHub issues are reserved for user-submitted bug reports and feature requests;
create those only after explicit approval.

Follow `/to-tickets`' draft-and-review flow before publication.
Do not automatically apply `ready-for-agent` or create labels, including when
`/to-spec` or another skill defaults to that label.
Reuse existing labels only when explicitly authorized.

## Local draft triage

Triage proposed work before publishing user-facing GitHub issues or internal
Project cards, as part of the local draft-and-review discussion:

- Check for duplicate issues and fit with the currently approved milestone.
- Review the user-visible outcome, acceptance criteria and genuine blockers.
- Identify missing information and unresolved product or provider decisions;
  do not describe a ticket as implementation-ready while those decisions gate it.
- Present the assessment and proposed breakdown for user approval before publishing.

"Local" means unpublished drafts in the current OMP session, not a second
Markdown tracker. Matt Pocock's triage skill is installed in
`.omp/skills/triage/`; use its analysis, verification, questioning and brief
format in this local-draft mode before publishing.

### Installed source

The upstream skill, reference documents and agent metadata are preserved
unchanged from [mattpocock/skills at 49dd158](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336/skills/engineering/triage).
The upstream MIT license is retained in `.omp/skills/triage/LICENSE`.
Cued-specific adaptations live in this document, not in the vendored source.

OMP discovers `.omp/skills/triage/SKILL.md` as a project skill. The native
invocation is `/skill:triage`; start a new Cued OMP session if the current
session has not discovered it yet.

### OMP and local-draft adaptations

- Read this tracker configuration before applying the upstream workflow.
- For an unpublished draft, use the proposed spec/tickets in the conversation
  as the report. Do not invent GitHub numbers, labels, comments or reporter
  activity. Read existing issues as needed to check duplicates and context.
- Recommend one category and one state per draft, explain the evidence and
  unresolved questions, and prepare any agent brief in the conversation.
  Do not post the brief or apply the upstream "Apply the outcome" writes
  until the user explicitly approves the specific GitHub changes.
- When the upstream skill says to call the "Skill tool", load the relevant
  `skill://grilling` and `skill://domain-modeling` instructions through OMP's
  read tool instead. Use the grilling wizard configured in `AGENTS.md`.
- Follow `docs/agents/domain.md` for document ownership. A brief must stay
  within the approved roadmap; it cannot override repository scope or safety
  rules. Persist domain decisions or rejection records only when authorized;
  do not create a placeholder `.out-of-scope/` knowledge base during setup.

### Draft role mapping

For local review, each canonical role maps to the identical text in the
assessment, not to a GitHub label:

- Category: `bug` or `enhancement`.
- State: `needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human` or `wontfix`.

This is the role mapping for draft-only mode; no further setup is required
for that mode. No GitHub label mapping is configured. Before any explicitly
requested label changes, inspect existing labels and confirm the intended
mapping; do not create new labels implicitly.

Do not automatically invoke triage against GitHub issues or dispatch the
existing GitHub triage workflow as part of spec or ticket creation.
The existing `.github/workflows/issue-triage.md` remains separate and owns its
classification rules and safe-output limits. Ticket skills do not expand
those permissions or approve milestones.

## Pull requests as a triage surface

**PRs as a request surface: no.**
