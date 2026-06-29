# AGENTS.md

> Trusted Instagram vendor directory for Nigeria — Next.js 16 + Convex self-hosted.

## Setup commands

- Install deps: `bun install`
- Web dev: `bun run dev` (Next.js 16, port 3000)
- Backend dev: `bun run convex:dev` (self-hosted Convex, codegen on save)
- Build: `bun run build` (Next standalone output)
- Typecheck: `bun run typecheck` (`bunx tsc --noEmit`)
- Lint: `bun run lint` (ESLint 9 flat config)
- Unit tests: `bun run test` (Vitest 3)
- E2E tests: `bun run test:e2e` (Playwright 1.50)

## Project layout

- `src/app/` — Next.js App Router (pages + `src/app/api/**` route handlers)
- `src/components/views/` — top-level page views (home, dashboards, vendor detail, event detail, blog)
- `src/components/shared/` — layouts and presentational components reused across views
- `src/components/ui/` — shadcn/ui primitives (Radix wrappers)
- `src/lib/` — utilities, validation, server-side Convex helpers, auth wrappers
- `convex/` — Convex schema, queries, mutations, helpers (self-hosted, no dashboard)
- `e2e/` — Playwright tests
- `tests/` — Vitest unit tests (run co-located `*.test.ts(x)` via `vitest.config.ts` globs)
- `public/` — static assets

## Code style

- TypeScript strict mode; no `any` escape hatches unless required by generated Convex types
- Tailwind CSS v4 + shadcn/ui + Radix — use **semantic color tokens** (`bg-surface`, `text-state-success-fg`), never raw hex outside `globals.css` token definitions
- React 19; use `next/image` for images with explicit `width`, `height`, and `sizes` — never raw `<img>`
- Search inputs must be **debounced 250–300ms** to avoid query thrash on every keystroke
- Touch targets ≥ 40×40 px (`h-10 w-10`) on mobile — never `h-8 w-8` on interactive elements
- Conventional commits: `feat:` / `fix:` / `refactor:` / `chore:` / `docs:` / `test:` (scoped, e.g. `feat(booking):`)
- ESLint 9 must pass before commit (`bun run lint`)

## Testing instructions

- Unit tests: `bun run test` (Vitest, co-located `*.test.ts(x)`)
- E2E tests: `bun run test:e2e` (Playwright, in `e2e/`)
- Add tests for every new behavior; never remove a failing test to make CI green
- All tests must pass before opening a PR

## PR & commit conventions

- Branch from `main`; never push to `main` directly (work goes through a feature branch and a PR)
- Commit message: conventional commits with a scope (`feat(booking): …`, `fix(auth): …`, `chore(audit): …`)
- Open PR via `gh pr create` once CI is green

## Security

- `.env.local` is gitignored — never commit credentials
- Login / auth mutations must call `rateLimit(key, 10, 60_000)` (in `convex/auth.ts`) and throw `ConvexError` when exceeded
- Privileged Convex functions must call `requireAdmin(ctx, actorId)` / `requireUser(ctx, actorId)` at the top
- `window.open()` for external links: always pass `noopener,noreferrer`
- Unauthenticated endpoints (e.g. `trackView`, public `[id]/view`) must accept `ip: v.optional(v.string())` and skip dedupe when null — client headers cannot be trusted
- Password minimum is 8 characters (`src/lib/validation.ts`)
