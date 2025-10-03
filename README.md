# BabyBloom

BabyBloom is a milestone-aware planner that keeps new families on schedule: it maps upcoming needs, scores products against the household profile, and suggests the next action before the window closes.

## Why This Stack
- **Next.js 15 + React 19** – App Router server components keep most pages static and quick, while client islands handle dashboards and chat.
- **TypeScript everywhere** – shared types flow from API handlers to UI, so milestone data and profile payloads stay in sync.
- **Tailwind CSS v4** – single design token source with PostCSS 8 pipeline; no runtime styling cost.
- **Clerk** – drop-in auth with session/webhook support, letting us focus on milestone logic rather than identity plumbing.
- **Vercel Postgres** – managed relational store with SQL-first migrations and array support for milestone tags.
- **OpenAI + custom agents** – generates ranked product rationale and timeline copy; the advisor chat sits behind dynamic import to keep bundles slim.
- **Vercel Analytics** – zero-config Web Vitals so we can validate the performance work we do in Next.

## Running Locally
1. `pnpm install`
2. Copy `.env.example` to `.env.local`, then fill Clerk, Postgres, and OpenAI credentials.
3. `pnpm dev` in one shell, then hit the migration/seed helpers:
   ```bash
   curl -X POST http://localhost:3000/api/database/migrate
   curl -X POST http://localhost:3000/api/products/seed
   ```
4. Visit `http://localhost:3000` for the app and `http://localhost:3000/how-it-works` for the guided tour.

Key commands:
```bash
pnpm lint    # eslint + type checking
pnpm build   # production build (requires @playwright/test if you enable Playwright)
pnpm dev     # live reload dev server
```

## Data Model Snapshot
User intake, profile preferences, and AI notes live in `user_profiles`; due-date calculations use the `milestones` table to anchor timelines. Products carry milestone ranges, sustainability tags, and review metadata so the advisor can explain each recommendation. Running the migration endpoint will create or update all tables, including baby name, location, and parent fields.

## Contributing
Work in small, verifiable commits (we use pnpm + conventional messages). Run `pnpm lint` before pushing, keep environment secrets in `.env.local`, and capture any new migrations with a note in your PR so the deployer can re-run the migration endpoint.
