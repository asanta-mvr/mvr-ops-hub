# MVR Operations Hub

Internal operational platform for **Miami Vacation Rentals** — the single source of truth for property, owner, building, and listing data across ~300 (→ 1,000) short-term rental units. Replaces the legacy Google Sheets + AppSheet workflow and connects N8N, Conduit, SuiteOp, and Breezeway into one system.

**Stack:** Next.js 14 (App Router) · TypeScript strict · Prisma · PostgreSQL (Cloud SQL) · NextAuth v5 · Tailwind + shadcn/ui · Vercel + GCP

## Quick start (local dev)

```bash
# Terminal 1 — Cloud SQL tunnel (keep running)
cloud-sql-proxy miami-vr-data:us-east1:mvr-ops-hub-db

# Terminal 2 — dev server
npm install
npm run dev
```

App runs at `http://localhost:3000`.
Dev login: `dev@miamivacationrentals.com` / `mvr-dev-2026`.

Other useful scripts:

| Script | Purpose |
|---|---|
| `npm run db:studio` | Prisma Studio at `localhost:5555` |
| `npm run db:seed` | Seed the 5 baseline buildings |
| `npx tsc --noEmit` | TypeScript check (must pass before any commit) |

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — master context: tech stack, design system, hard rules, known deviations, infrastructure. Read this before writing any code.
- **[ROADMAP.md](ROADMAP.md)** — phase plan and current progress.

## Repo conventions

- Local branch is `master`, remote is `main`. Push with `git push origin HEAD:main`.
- Conventional Commits (`feat(owners): …`, `fix(auth): …`).
- Never push to GitHub without explicit confirmation.
- Two env files — see [CLAUDE.md → LOCAL DEV ENVIRONMENT](CLAUDE.md#local-dev-environment) for the `.env.local` vs `.env.risk.local` split.
