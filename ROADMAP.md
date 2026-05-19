# MVR Operations Hub — Roadmap

Phase plan and progress tracker. Update this file as work lands; keep `CLAUDE.md` for stable "how to build" context.

**Current phase:** 1 — Data Master.
**Last updated:** 2026-05-15.

---

## ✅ Phase 0 — Setup (COMPLETE)

Foundation work that unlocks everything else.

- Next.js 14 (App Router) + TypeScript strict, zero `any`.
- Tailwind 3.4 + shadcn/ui with MVR brand tokens (`tailwind.config.ts`).
- Prisma 5 connected to Cloud SQL (`miami-vr-data:us-east1:mvr-ops-hub-db`).
- NextAuth v5 beta — Google OAuth + dev credentials (`CredentialsProvider`).
- Protected dashboard layout, role-aware sidebar, no-access fallback page.
- PWA manifest + offline-friendly static assets.
- Sentry integration on `@sentry/nextjs`.
- Deployed to Vercel (preview + production).
- **Settings + RBAC backbone** — users + roles module (commit `e8d2314`).

## 🔄 Phase 1 — Data Master (IN PROGRESS)

Replace AppSheet as the canonical source of truth for buildings, owners, units, and listings.

| Item | Status | Notes |
|---|---|---|
| Buildings — full CRUD + API + seed | ✅ Done | 5 AppSheet buildings seeded via `npm run db:seed` |
| Property Managers — CRUD nested under Building detail | 🔲 Pending | Live under `/data-master/buildings/[id]` |
| Owners — full CRUD at `/data-master/owners` | 🔲 Pending | |
| Units — `/data-master/units`, nested under Building | 🔲 Pending | |
| Listings — nested under Unit | 🔲 Pending | OTA channel icons already in `public/icons/ota-*` |
| Owner Contracts + Docs + Utilities | 🔲 Pending | Uses GCS signed URLs |
| Onboarding Checklist flow | 🔲 Pending | |
| Unit Inspection form (mobile-optimized) | 🔲 Pending | PWA target |

### Side tracks landed in Phase 1

- Risk / chargebacks dashboard overhaul + Stripe ingestion fixes (commit `39e29314`).
- Settings + Users module with RBAC backbone (commit `e8d2314`).
- Customer Success — Reviews module (commit `e6d491a`), review detail modal with unit snapshot + channel icons.
- Reviews weekly brief PDF + Slack delivery via n8n cron (`/api/v1/reviews/weekly-brief`, token-gated, runs Mondays 8 AM ET).

## ⏭ Phase 2+ — Future

Sequencing TBD; pulled in priority order as Phase 1 wraps.

1. **Customer Success module** — tickets, OTA channel routing, escalations.
2. **Guesty integration** — reservation sync.
3. **Operations module** — turnover, inspections, ops calendar.
4. **Breezeway + SuiteOp + Conduit integrations** — work-order pipeline.
5. **Brivo** — access control.
6. **Stripe** — owner payouts + chargeback ops (partially built; see risk dashboard).

---

## How to update this file

- When a checklist item ships: flip 🔲 → ✅ and add the commit ref.
- When a new sub-task surfaces: add a row before merging the change.
- When a phase wraps: collapse its detail table into a one-line summary like Phase 0 above.
- **Don't move this content back into `CLAUDE.md`** — keeping them separate prevents every checkbox-flip commit from touching the master context file.
