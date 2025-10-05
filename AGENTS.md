# Agent Operating Guide

## Mission
Equip every contributor (human or automated) to ship reliable Next.js features for Babyshop. Reference this guide at the start of each task to align on architecture, delivery expectations, and deployment hygiene.

## Core Principles
- Read the full task, open files, and recent commits before touching code; capture unknowns and confirm assumptions early.
- Form a lightweight plan that lists impacted areas and validation steps. Update the plan as you execute.
- Prefer minimal, reversible diffs that leave the main branch deployable at all times.
- Document what you validated (commands, screenshots, manual flows) and flag anything you could not verify.

## Project Structure & Ownership
- App Router lives in `src/app`; use nested segments (`admin`, `curated`, `profile`, etc.) with `page.tsx`, `layout.tsx`, and colocated loading/error boundaries.
- API handlers sit under `src/app/api/<resource>/route.ts`; export the relevant HTTP verbs and respect Next.js Response helpers.
- UI building blocks belong in `src/components`; memoize or convert to client components (`'use client'`) only when interaction or browser APIs are required.
- Domain logic stays in `src/lib` (agents, products, milestones, profile mappers). Keep business rules in services/helpers so both routes and background jobs can reuse them.
- Types and zod schemas reside in `src/types` and `src/schemas`. Extend schemas before serializing new payloads.
- Static assets remain in `public/`. CLI utilities and smoke scripts live in `scripts/`.

## Next.js + Vercel Delivery Patterns
- Default to server components for data access; promote only the minimal interactive surface to client components.
- When fetching inside server components, lean on built-in caching: annotate with `cache`, `revalidate`, or `next: { revalidate: <seconds> }` based on freshness requirements.
- For request handlers, use the `src/lib/*/service.ts` wrappers rather than hitting fetch URLs directly; this keeps Vercel edge + node deployments consistent.
- Prefer `Route Handlers` or `Server Actions` for mutations so credentials stay server-side. Never expose secrets via client-side fetches.
- Align with Vercel deployment targets: use edge runtime (`export const runtime = 'edge'`) only when dependencies are compatible; otherwise rely on the default node runtime for DB access.
- Keep bundle size lean: lazy-load heavy client components, strip unused locale/data, and avoid dynamic `import()` inside render loops.

## Data & API Integration
- Services under `src/lib/*/service.ts` normalize responses from `/api/*`. Reuse them in pages, hooks, and background tasks to retain a single source of truth.
- Validate external data with the appropriate zod schema before it enters the React tree. Extend schema definitions in `src/schemas` instead of inlining validations.
- Persist stateful UI in hooks under `src/hooks`. Co-locate hook-specific tests alongside their implementation.
- When touching Postgres-facing flows, favor transactional helpers or service methods that already handle retries and logging.

## Local Development Workflow
- Run `pnpm install` once after pulling dependencies.
- Whenever dependencies change, run the relevant verification commands (`pnpm lint`, `pnpm test`, targeted smoke scripts) to ensure the new packages behave as expected before shipping.
- Use `pnpm dev` for the local server (`http://localhost:3000`). Add feature-specific loading and error UI to match App Router conventions.
- `pnpm lint`, `pnpm test`, and `pnpm build` must be green before declaring a task done. If a command is skipped, document why and outline how a reviewer can reproduce it.
- Database smoke scripts run via `pnpm exec node scripts/test-*.js`. Load `.env.local` with the latest service credentials beforehand.

## Testing & QA Expectations
- Co-locate Vitest/Jest unit tests beside the module you touch. Target critical domain logic inside `src/lib` and custom hooks.
- Exercise Next.js routing through Playwright e2e specs under `e2e/` when navigation or form flows change.
- Maintain disposable Postgres databases for integration tests to avoid polluting shared data.
- Record manual QA: list user flows visited, API calls verified, and screenshots or JSON diffs when UI/data changes are visible.

## Deployment & Observability
- Every push to a PR branch triggers a Vercel Preview Deployment; validate the relevant pages there before merging.
- Keep environment variables synchronized across Development, Preview, and Production in Vercel. Never rely on defaults that only exist locally.
- Inspect Vercel build output for warnings about deprecated APIs, large lambda sizes, or missing environment variables.
- Capture logs and metrics using the project’s observability stack (e.g., Vercel logs, Sentry, or console breadcrumbs). Surface regressions with actionable context.

## Git & PR Protocol
- Use Conventional Commit messages (e.g., `feat: add curated timeline cards`). Break large efforts into reviewable commits.
- PR descriptions should include: problem statement, summary of the solution, validation commands, manual QA notes, and any screenshots/JSON proof.
- Rebase or merge main frequently to keep preview deployments representative of production.

## Database Schema Tracker
- `users`: `clerk_id` primary key, contact fields, timestamps.
- `user_profiles`: per-user preferences (budget tier, eco flags, care network) linking to `users`.
- `milestones`: labels, descriptions, month ranges, focus arrays.
- `products`: catalog metadata, milestone and tag arrays, pricing, review JSON, period windows.
- `ai_categories` and `product_ai_categories`: AI tagging lookup plus join table.
- `product_reviews`: external review snapshots keyed by product.
- `user_product_recommendations` and `user_product_interactions`: scoring history and activity feed.

## Security & Environment Hygiene
- Keep secrets in `.env.local` and the corresponding Vercel environment settings; never commit or log them.
- Rotate Clerk, OpenAI, Postgres, and any third-party tokens immediately after debugging sessions.
- Review dependencies for known vulnerabilities during upgrades; note any follow-up remediation tasks in the PR description.

## Task Checklist
- Confirm instructions: repository guidelines, task-specific notes, and recent code context.
- Plan your approach, list validation steps, and sync with stakeholders if scope is unclear.
- Execute changes with incremental validation (`pnpm lint`, `pnpm test`, targeted `pnpm build`).
- Document results, push when clean, and hand off with clear next steps or outstanding risks.
