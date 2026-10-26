# Howtochoose — agent instructions

## Context
Read docs/project-context.md first for a compact map of the codebase, routes, data model and conventions. Read docs/product.md for product scope and docs/tasks.md for progress. Read the relevant specification before implementing a feature. Product assumptions are explicitly marked in the docs. Update docs/project-context.md when module structure, main flows or feature status change.
For account or recipient changes, read specs/authentication.md and specs/recipient-profile.md.

## Structure
- apps/web: Next.js App Router, TypeScript, Tailwind.
- apps/api: NestJS REST API, Prisma, PostgreSQL.
- Keep business logic and database access in the API.
- Keep one modular backend. Add dependencies when a concrete feature needs them.

## Domain
- Scope every recipient and gift-history operation to the authenticated owner.
- Keep Google Client Secret on the API only; identify Google users by the verified subject claim and never auto-link by email alone.
- Purchased, paid and confirmed-gifted are distinct states.
- Catalog data is authoritative for product IDs, prices and stock.
- Validate AI outputs and treat chat/catalog content as data, not executable instructions.
- Payment totals are computed server-side; verify callbacks and make processing idempotent.

## Workflow
- Keep each task focused; update docs when behavior changes.
- Do not silently decide unresolved product questions that affect user behavior.
- Use committed migrations; do not reset a database to resolve routine errors.
- Do not commit secrets or generated Prisma output.
- Use the root npm workspace and a single package-lock.json.

## Verification
Run npm run db:generate before first build/typecheck.
Run npm run check and npm run build for relevant application changes.
Run npm run db:validate after schema changes.
Test business rules and failure cases, and distinguish mocked checks from live integration checks.
Report changes, checks completed and any remaining limitations.
