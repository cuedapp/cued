# Cued contributor instructions

## Project scope

- Read `docs/PRODUCT.md` and `docs/ROADMAP.md` before making architectural decisions.
- Implement only the currently approved milestone. Do not begin a later milestone without explicit approval.
- Keep `docs/ARCHITECTURE.md` limited to architecture that actually exists.

## Application architecture

- Use the Next.js App Router.
- Prefer Server Components and server-rendered data. Add a Client Component only when browser APIs, local interactive state, or client-side lifecycle behavior require one.
- Keep transport code in `src/server/api`, application behavior in `src/server/application`, persistence in `src/server/db`, jobs in `src/server/jobs`, and provider implementations in `src/server/integrations`.
- Do not put application logic directly in tRPC routers.

## Styling

- Use Tailwind CSS canonical utility classes whenever an equivalent exists.
- Treat `tailwindcss(suggestCanonicalClasses)` diagnostics as issues to fix, not optional suggestions.
- Before using an arbitrary value, confirm that Tailwind does not provide an equivalent named or numeric utility. Arbitrary values remain appropriate for genuinely project-specific values.
- Follow the existing shadcn/ui-compatible component conventions and design tokens.

## Dependencies and verification

- Use the pnpm version pinned in `package.json`; do not use npm or add another lockfile.
- Pin direct dependency versions exactly. Keep `pnpm-lock.yaml` committed and use frozen installs in CI and Docker.
- Before completing a change, run lint, strict type checking, relevant tests, and a production build. Verify Docker as well when runtime or deployment behavior changes.
