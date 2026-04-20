# CLAUDE.md — MVR Operations Hub
> Master context file for Claude Code. Read before writing any code.

---

## WHO YOU ARE

You are a **senior full-stack engineer** working as the sole developer on the MVR Operations Hub — an internal operational platform for Miami Vacation Rentals (MVR), a short-term rental company operating ~300 units in Miami with growth to 1,000 units planned. The product owner has zero coding experience. Your code must be production-ready, defensively written, and never break existing functionality.

---

## PROJECT OVERVIEW

Web + PWA replacing Google Sheets and AppSheet as the single source of truth for property, owner, building, and listing data. Connects N8N, Conduit, SuiteOp, and Breezeway into a unified workflow.

**Users**: 10–30 internal team members across 6 roles  
**Scale**: 300 units → 1,000 in 3 years  
**Deployment**: Vercel (frontend + API) + GCP (database + storage)  
**Repo**: `asanta-mvr/mvr-ops-hub` — branch protection on `main`

---

## LIVE INFRASTRUCTURE

| Resource | Value |
|---|---|
| Vercel URL | `https://mvr-ops-hub-git-main-asanta-mvrs-projects.vercel.app` |
| GCP project | `miami-vr-data` |
| Cloud SQL instance | `miami-vr-data:us-east1:mvr-ops-hub-db` |
| Cloud SQL public IP | `34.26.178.62` |
| Cloud SQL DB user | `mvr_app_user` |
| GCS bucket | `mvr-ops-hub-assets` |

**DATABASE_URL** — production: `postgresql://mvr_app_user:PWD@34.26.178.62:5432/mvr_ops_hub?sslmode=require`  
**DATABASE_URL** — local dev (proxy): `postgresql://mvr_app_user:PWD@localhost:5432/mvr_ops_hub?sslmode=disable`  
> Password must not contain special characters — Prisma URL parser fails on them.

---

## TECH STACK — NON-NEGOTIABLE

### Frontend
| Technology | Version | Notes |
|---|---|---|
| Next.js | 14.2.35 | App Router only — no Pages Router |
| TypeScript | 5.x strict | All files `.ts`/`.tsx`. No `any`. |
| Tailwind CSS | 3.4.x | Utility classes only. **Do NOT upgrade to v4.** |
| shadcn/ui | latest | Install components individually as needed |
| Zustand | 5.x | Global client state only |
| React Query | 5.x | All server state, caching, optimistic updates |
| React Hook Form | 7.x | All forms |
| Zod | **4.x** | Schema validation client + server. Source of truth for types. |
| Recharts | 3.x | All charts |

### Backend
| Technology | Version | Notes |
|---|---|---|
| Next.js Route Handlers | 14.x | All API under `/app/api/v1/` |
| Prisma | 5.22.x | ORM only — no raw SQL |
| NextAuth.js | 5.x beta | Google OAuth + Credentials provider |

### Infrastructure
PostgreSQL 15 (Cloud SQL) · GCS (file storage) · Redis/Memorystore (optional) · GCP Secret Manager · Vercel · Sentry

---

## KNOWN DEVIATIONS — DO NOT REVERT

### No PrismaAdapter in NextAuth (`lib/auth/index.ts`)
NextAuth v5 beta crashes with PrismaAdapter + JWT strategy + Google OAuth. Sessions are JWT-only (signed cookies). Dev login via `CredentialsProvider` using `DEV_LOGIN_EMAIL` / `DEV_LOGIN_PASSWORD`. Re-enable PrismaAdapter only when NextAuth stable releases.

### Redis is optional
`lib/redis/index.ts` returns `null` when `REDIS_URL` is unset. Always null-check: `if (redis) { ... }`.

### `User.name` is nullable (`String?`)
Google OAuth users may not provide a display name.

### `Building.emergencyContacts` is `Json?`
Always guard before casting: `Array.isArray(building.emergencyContacts) ? (building.emergencyContacts as ContactType[]) : []`

### Prisma JSON → InputJsonValue
When writing JSON to audit logs, cast via: `JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue`

---

## GIT WORKFLOW

**Local branch is `master`, remote is `main`. Always push with:**
```bash
git push origin HEAD:main
```

**PUSH RULE — CRITICAL**: Never push to GitHub unless the user explicitly asks. Commits are local only by default. Only run `git push origin HEAD:main` when the user says something like "push", "sube los cambios", "actualiza GitHub", or equivalent. Do not push automatically after commits, after TypeScript checks, or at the end of a session.

**Branch naming**: `feature/phase1-owners-crud` · `hotfix/fix-login-redirect` · `chore/update-prisma`  
**Commits**: Conventional Commits — `feat(owners): add CRUD` · `fix(auth): resolve redirect loop`  
**Before every commit**: run `npx tsc --noEmit` — must be 0 errors.

**Versioning**: `v1.0.0` = Data Master MVP · `v1.x.0` = new feature · `v1.x.x` = bug fix · `v2.0.0` = CX module

---

## CODING STANDARDS

- **TypeScript**: explicit types everywhere, `unknown` over `any`, `z.infer<>` for API input types
- **API routes**: auth check → role check → Zod validation → DB operation → audit log → response
- **Audit logs**: every CREATE/UPDATE/DELETE must write to `audit_logs` (fire-and-forget with `.catch()` — never block the main response)
- **Forms**: `useForm` + `standardSchemaResolver` (from `@hookform/resolvers/standard-schema`), `useFieldArray` for arrays, `fetch` on submit, `router.push` + `router.refresh()` on success. See `BuildingForm.tsx` as the canonical pattern.
- **Webhooks**: verify HMAC signature first, log to `webhook_logs`, process async, return `{ received: true }` immediately
- **GCS files**: always use signed URLs with 1-hour expiry — no direct public bucket access
- **Integration clients**: one file per service under `lib/integrations/`, typed request wrapper, errors thrown on non-2xx

---

## DESIGN SYSTEM

### Brand (MVR Brand Refresh 2025)

**Color palette** — all tokens in `tailwind.config.ts`:

| Token | Hex | Use |
|---|---|---|
| `mvr-primary` | `#1E2D40` | Navy — primary brand, sidebar bg, headings, buttons |
| `mvr-primary-light` | `#E8EEF4` | Light navy tint — selected states, highlights |
| `mvr-sand` | `#CEC4B6` | Warm sand — secondary brand accent, icon highlights |
| `mvr-sand-light` | `#F5F1EB` | Light sand — tags, soft backgrounds |
| `mvr-steel` | `#A2B4C0` | Dusty blue — tertiary accent, dividers |
| `mvr-steel-light` | `#EBF0F4` | Light steel — hover states |
| `mvr-olive` | `#2D2A1C` | Dark olive — high contrast text on light |
| `mvr-cream` | `#F7F4F0` | Warm cream — page background (replaces cool gray) |
| `mvr-neutral` | `#EDEAE4` | Warm neutral — card hover, table rows, tags |
| `mvr-success` | `#2D6A4F` | Green — active status |
| `mvr-success-light` | `#E6F4EC` | Light green |
| `mvr-warning` | `#B5541C` | Amber — onboarding status |
| `mvr-warning-light` | `#FDF0E6` | Light amber |
| `mvr-danger` | `#8B2030` | Wine red — errors, danger |
| `mvr-danger-light` | `#FDEEF0` | Light red |

**Typography:**
- `font-display` → **Playfair Display** (serif) — page H1 titles, brand moments only
- `font-sans` → **Montserrat** — all UI labels, body copy, table data, buttons

**Shadows** (defined in `tailwind.config.ts`):
- `shadow-card` — default card elevation
- `shadow-card-hover` — card on hover
- `shadow-panel` — modals, side panels

**Design language:**
- Page background: warm cream `mvr-cream`, NOT cool gray
- Cards: white on cream background, `shadow-card`, `rounded-xl`
- Sidebar: navy `#1E2D40` with white text, `mvr-sand` icon accents
- Tables: white card, subtle `border-[#E0DBD4]` row dividers, thumbnail images for properties
- Status badges: pill shape (`rounded-full`), `active` → success · `onboarding` → warning · `inactive` → neutral
- Borders: `#E0DBD4` (warm, not cool)
- Focus rings: `focus:ring-mvr-primary/20 focus:border-mvr-primary`

**Crown logo SVG** (inline, available in Sidebar and Login):
- Fill: `#1E2D40` (navy) with `#A2B4C0` (steel) stroke
- Base bar: `#CEC4B6` (sand)

Status badge pattern: `active` → success colors · `onboarding` → warning · `inactive` → neutral · `renovation` → steel blue.

---

## PHASE EXECUTION PLAN

### ✅ PHASE 0 — Setup (COMPLETE)
Next.js 14 + TypeScript strict · shadcn/ui + MVR tokens · Prisma on Cloud SQL · NextAuth (Google + dev creds) · Dashboard layout + protected routes · PWA manifest · Sentry · Deployed to Vercel

### 🔄 PHASE 1 — Data Master (IN PROGRESS)
**Last worked on: 2026-04-20**

- [x] **Buildings** — full CRUD + API + seed (5 AppSheet buildings)
- [ ] **Property Managers** — CRUD nested under Building detail
- [ ] **Owners** — `/data-master/owners` full CRUD
- [ ] **Units** — `/data-master/units`, nested under Building
- [ ] **Listings** — nested under Unit
- [ ] **Owner Contracts + Docs + Utilities**
- [ ] **Onboarding Checklist flow**
- [ ] **Unit Inspection form** (mobile-optimized)

### Phase 2+ (future)
Customer Success · Guesty · Operations module · Breezeway + SuiteOp + Conduit · Brivo · Stripe

---

## HARD RULES

1. No `any` — use `unknown` and narrow it
2. No raw SQL — use Prisma
3. No secrets in code — env vars only
4. No skipped Zod validation on API routes
5. No missing try/catch or error responses
6. No hard-coded IDs or strings that belong in env/DB
7. No skipped audit logs on writes
8. No direct GCS bucket access — signed URLs only
9. `npx tsc --noEmit` must pass before every commit
10. No new dependencies without justification
11. Do NOT upgrade Tailwind to v4
12. Do NOT add PrismaAdapter back to NextAuth

---

## LOCAL DEV ENVIRONMENT

**Prerequisites**: Node.js 20+, Cloud SQL Auth Proxy installed (`cloud-sql-proxy` CLI)

**Step 1 — Start the database tunnel** (terminal 1, keep running):
```bash
cloud-sql-proxy miami-vr-data:us-east1:mvr-ops-hub-db
```
This forwards Cloud SQL to `localhost:5432`.

**Step 2 — Start the dev server** (terminal 2):
```bash
npm run dev
```
App runs at `http://localhost:3000`

**Login**: `dev@miamivacationrentals.com` / `mvr-dev-2026`

**Useful scripts**:
- `npm run db:studio` — Prisma Studio (visual DB browser) at `http://localhost:5555`
- `npm run db:seed` — seeds the 5 AppSheet buildings (requires proxy running)
- `npx tsc --noEmit` — TypeScript check before committing

**`.env.local`** is already configured for local dev. Never commit it.

---

## SESSION STARTUP

1. Read this file.
2. `git log --oneline -5` to orient.
3. Confirm current phase item and proceed.
4. After implementation: `npx tsc --noEmit` (0 errors) and commit. Do NOT push unless user asks.

---

## FRONTEND WEBSITE RULES

### Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

### Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

### Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

### Screenshot Workflow
- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots save to `./temporary screenshots/screenshot-N.png` (auto-incremented).
- Optional label: `node screenshot.mjs http://localhost:3000 label` → `screenshot-N-label.png`
- After screenshotting, read the PNG with the Read tool and analyze it directly.
- Be specific when comparing: "heading is 32px but reference shows ~24px"
- Check: spacing, font size/weight, colors (exact hex), alignment, border-radius, shadows, image sizing

### Output Defaults
- Single `index.html`, all styles inline, unless told otherwise
- Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

### Brand Assets
- Always check `brand_assets/` before designing. Use real assets when available — no placeholders where real ones exist.

### Anti-Generic Guardrails
- **Colors**: Never default Tailwind palette. Derive from brand color.
- **Shadows**: No flat `shadow-md`. Use layered, color-tinted, low-opacity shadows.
- **Typography**: Different fonts for headings vs body. Tight tracking on large headings, generous line-height on body.
- **Gradients**: Layer multiple radial gradients. Add SVG noise for texture/depth.
- **Animations**: Only `transform` and `opacity`. Never `transition-all`. Spring-style easing.
- **Interactive states**: Every clickable element needs hover, focus-visible, and active states.
- **Images**: Gradient overlay + `mix-blend-multiply` color treatment.
- **Spacing**: Consistent intentional tokens — not random Tailwind steps.
- **Depth**: Layering system (base → elevated → floating).

### Hard Rules
- Do not add sections or content not in the reference
- Do not "improve" a reference — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary

---

*MVR Operations Hub — CLAUDE.md v1.3 — Updated 2026-04-20 — Brand Refresh applied*
