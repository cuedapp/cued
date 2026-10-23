# Cued contributor instructions

## Documentation routing

Use each document for its own task; this is the shared map for contributors and agents.

| Document                                                               | Read or update for                                                                            | Do not use it as                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                 | Repository working rules and this document map                                                | A feature specification or release checklist                    |
| [GLOSSARY.md](GLOSSARY.md)                                             | Agreed terms, delivery meanings and version-bump semantics                                    | A procedure or permission to publish/deploy                     |
| [docs/PRODUCT.md](docs/PRODUCT.md)                                     | Product vision, principles, intended experience and non-goals                                 | Approved work or proof a feature exists                         |
| [docs/ROADMAP.md](docs/ROADMAP.md)                                     | Current approved milestone, acceptance criteria, candidates and current delivery status       | Current implementation details or completed milestone history   |
| [docs/ROADMAP-HISTORY.md](docs/ROADMAP-HISTORY.md)                     | Completed/shipped milestone records and superseded proposals                                  | Current approved scope or proof of implementation behavior      |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                           | Implemented boundaries, data flow and runtime behavior                                        | A place for proposed architecture or operating checklists       |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)                             | Local setup, verification, migrations and release procedures                                  | End-user installation guidance or feature approval              |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                     | Human contribution, pull-request and review workflow                                          | A second copy of engineering rules or release procedures        |
| [README.md](README.md)                                                 | Current user-facing capabilities, installation, integration operations, upgrades and rollback | A development backlog                                           |
| [CHANGELOG.md](CHANGELOG.md)                                           | User-visible changes and release/upgrade notes                                                | Scope approval or evidence that Unreleased changes have shipped |
| [.github/workflows/issue-triage.md](.github/workflows/issue-triage.md) | The issue-triage agent's classification task and allowed outputs                              | Implementation, release or milestone approval                   |
| [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)           | Engineering skills' ticket tracker, issue operations and roadmap-to-task ownership            | Milestone approval or permission to publish tickets             |
| [docs/agents/domain.md](docs/agents/domain.md)                         | Engineering skills' domain-document layout and consumer rules                                 | A second glossary, roadmap or architecture specification        |

- For implementation, combine agreed terms, product intent, approved scope and the relevant implemented architecture before editing; use the development guide to verify the change.
- For release requests, interpret the requested endpoint with the glossary and follow the development guide's release process. Deployment remains a separate operator task.
- For issue triage, follow the task-specific prompt and its safe-output limits. Shared repository context does not expand the automation's permissions. Its generated `.lock.yml` is not a hand-edited instruction document.
- Update the document that owns the changed fact or agreement, then repair affected links or summaries. Prefer links over copying policies and checklists into multiple files.
- If documents disagree, resolve the specific kind of conflict: ask the owner about changed meanings or scope; check source and observed behavior for implementation facts. Report stale documentation rather than silently turning intent into implemented behavior.

## Project scope

- Read `GLOSSARY.md` for agreed terminology, especially delivery states and release requests.
- Read `docs/PRODUCT.md` and `docs/ROADMAP.md` before making architectural decisions.
- Implement only the currently approved milestone. Do not begin a later milestone without explicit approval.
- Keep `docs/ARCHITECTURE.md` limited to architecture that actually exists.
- Keep integration credentials out of `.env`; future provider configuration belongs in the application.

## Agent skills

### Issue tracker

GitHub Issues in `cuedapp/cued` is the single tracker. Read
`docs/agents/issue-tracker.md` before using ticket skills.

`docs/ROADMAP.md` owns current milestone scope, approval and delivery status.
Completed and shipped milestone records live in `docs/ROADMAP-HISTORY.md`.
Tickets decompose approved scope; creating or classifying a ticket does not approve
new work or resolve an open product question.

### Domain docs

Use the single-context layout and Cued's existing document ownership.
Read `docs/agents/domain.md` before domain exploration or ticket drafting.

### Grilling sessions

Use OMP's interactive `ask` wizard by default for grilling sessions, unless the
user requests another format. This changes presentation, not the grilling
skill's decision-tree method or approval requirements.

- Keep each question short, with 2–5 concrete options, concise tradeoffs and a
  recommended choice when supported by the evidence.
- Batch related, independently answerable frontier questions in one round.
  Defer questions whose prerequisites remain unsettled; pause for answers before
  advancing to the next round.
- Accept custom/free-text answers through the wizard's built-in input; do not
  add a separate "Other" option or repeat the questionnaire in chat.
- Research repository facts rather than asking the user to supply them. Once
  the decisions are settled, summarize them and obtain confirmation before acting.

### Triage sessions

Matt Pocock's triage skill is installed repo-locally in `.omp/skills/triage/`.
Before using it, read the local-draft mode and OMP adaptations in
`docs/agents/issue-tracker.md`. Default to unpublished draft review in the
current OMP session; installation does not authorize GitHub writes, labels,
issue closure or workflow dispatches.

## Application architecture

- Use the Next.js App Router.
- Prefer Server Components and server-rendered data. Add a Client Component only when browser APIs, local interactive state, or client-side lifecycle behavior require one.
- Keep transport code in `src/server/api`, application behavior in `src/server/application`, persistence in `src/server/db`, jobs in `src/server/jobs`, and provider implementations in `src/server/integrations`.
- Do not put application logic directly in tRPC routers.
- Keep provider implementations isolated within `src/server/integrations` when their milestones begin.

## Styling

- Use Tailwind CSS canonical utility classes whenever an equivalent exists.
- Treat `tailwindcss(suggestCanonicalClasses)` diagnostics as issues to fix, not optional suggestions.
- Before using an arbitrary value, confirm that Tailwind does not provide an equivalent named or numeric utility. Arbitrary values remain appropriate for genuinely project-specific values.
- Follow the existing shadcn/ui-compatible component conventions and design tokens.
- Prefer shared components for recurring controls, states, and layouts. Before adding page-specific UI, check for an existing shared component and extract one when the behavior will be reused.
- Keep user-facing text in translation files and update English, Swedish, and Dutch together.

## Dependencies and verification

- Use the pnpm version pinned in `package.json`; do not use npm or add another lockfile.
- Pin direct dependency versions exactly. Keep `pnpm-lock.yaml` committed and use frozen installs in CI and Docker.
- Make database changes through committed, forward-only Drizzle migrations. Never alter a migration that may already have been applied.
- Never log secrets, tokens, connection strings, or user-private media data.
- Add or update focused tests for behavior changes. Update architecture documentation when implemented boundaries change.
- Before completing a change, run lint, strict type checking, relevant tests, and a production build. Verify Docker as well when runtime or deployment behavior changes.

## Git workflow

- Write clear, descriptive commit messages that explain the change’s purpose. Messages should make the history understandable to both developers and future AI contributors.
- Do not create a commit for each intermediate edit. Keep related work uncommitted until it has been reviewed or explicitly approved, then make one focused commit.
- Work on `develop`; keep `main` for tested stable-release promotions.
- Use focused feature branches when collaboration begins, and merge them into `develop` through a pull request.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
