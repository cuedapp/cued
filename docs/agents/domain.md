# Domain docs

## Before exploring or drafting tickets

Follow the document routing in `AGENTS.md`:

- `GLOSSARY.md`: agreed terms and delivery meanings.
- `docs/PRODUCT.md`: product intent and non-goals.
- `docs/ROADMAP.md`: current approved scope, acceptance criteria and remaining questions.
- `docs/ROADMAP-HISTORY.md`: completed/shipped milestone history and superseded
  proposals; read when historical context is relevant, not as current approval.
- `docs/ARCHITECTURE.md`: implemented boundaries and runtime behavior.
- `docs/DEVELOPMENT.md`: verification and development procedures.

## Layout

This is a single-context repository. If they exist, read root `CONTEXT.md`
and relevant decisions in `docs/adr/`.

Absent context or ADR files do not block work. Do not create placeholder
domain documents during setup.

`CONTEXT.md` may record additional domain understanding; it does not replace
`GLOSSARY.md` or duplicate roadmap approval and architecture facts.
When terms or decisions are resolved, update the document that owns them.

## Vocabulary and conflicts

Use Cued's agreed glossary vocabulary in tickets and implementation.
Surface conflicts with relevant ADRs or repository documents rather than
silently overriding them. Refer unresolved scope or meaning questions to
the project owner.
