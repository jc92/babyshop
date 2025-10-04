# Repository Guidelines

## Project Structure & Module Organization
Next.js routes live in `src/app` with segments like `admin`, `curated`, `profile`, and API handlers under `/api`. Shared UI sits in `src/components`; domain helpers stay in `src/lib` (agents, products, milestones, profile mappers). Types and zod schemas live in `src/types` and `src/schemas`. Assets stay in `public/`; smoke scripts live in `scripts/`.

## Front-End Architecture & API Integration
Pages use the App Router: server components fetch data and hand results to client components. Reuse the `src/lib/*/service.ts` wrappers for `/api/*` calls so responses stay normalized. Keep state in `src/hooks`, copy in `src/lib/copy`, add loading/error UI, and have admin views rely on these services instead of querying Postgres directly.

## Build, Test & Development Commands
Run `pnpm install` once, then use `pnpm dev` for the dev server on port 3000. `pnpm build` compiles production assets, `pnpm start` serves them, and `pnpm lint` applies the root ESLint config. Always keep `pnpm lint`, `pnpm test`, and `pnpm dev` green before pushing. Database smoke scripts run with `pnpm exec node scripts/test-*.js`; hydrate `.env.local` before running them.

## Coding Style & Naming Conventions
Use TypeScript functional components with two-space indentation, trailing commas, and single quotes per `eslint-config-next`. Components and hooks use PascalCase and camelCase respectively. Segment folders mirror Next.js routing (e.g., `src/app/api/products/route.ts`). Group Tailwind classes by layout, spacing, then theme.

## Testing Guidelines
Use disposable Postgres databases. Name scripts `scripts/test-<scope>.js` and log checkpoints. Add domain unit coverage (Vitest or Jest) beside the module and note any manual QA in the PR.

## Commit & Pull Request Guidelines
Commits use Conventional Commit prefixes (e.g., `feat: add curated timeline cards`). Capture each stable checkpoint in git with a concise message, keep changes modular and incremental, and verify the build plus core flows before pushing. Pull requests should state the problem, summarize the solution, list validation commands, and attach screenshots or JSON diffs for UI or data changes while linking related issues.

## Database Schema Tracker
- `users`: `clerk_id` primary key, contact fields, timestamps.
- `user_profiles`: per-user preferences (budget tier, eco flags, care network) linking to `users`.
- `milestones`: labels, descriptions, month ranges, focus arrays.
- `products`: catalog metadata, milestone and tag arrays, pricing, review JSON, period windows.
- `ai_categories` and `product_ai_categories`: AI tagging lookup plus join table.
- `product_reviews`: external review snapshots keyed by product.
- `user_product_recommendations` and `user_product_interactions`: scoring history and activity feed.

## Environment & Security
Keep secrets in `.env.local`; never commit them and rotate Clerk, OpenAI, and Postgres keys after debugging.
