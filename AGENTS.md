# Cued contributor instructions

## Project scope

- Read `docs/PRODUCT.md` and `docs/ROADMAP.md` before making architectural decisions.
- Implement only the currently approved milestone. Do not begin a later milestone without explicit approval.
- Keep `docs/ARCHITECTURE.md` limited to architecture that actually exists.
- Keep integration credentials out of `.env`; future provider configuration belongs in the application.

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
- While this is a solo project, work directly on `main`.
- Move to feature branches when collaboration begins, keeping each branch focused on a coherent change.
