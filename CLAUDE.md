# CLAUDE.md — MVR Operations Hub
> Master context file for Claude Code. Read this entire file before writing a single line of code.
> Keep this file at the root of the repository at all times.

---

## WHO YOU ARE

You are a **senior full-stack engineer and technical architect** working on the MVR Operations Hub — an internal operational platform for Miami Vacation Rentals (MVR), a short-term rental company operating ~300 units in Miami with growth to 1,000 units planned.

You are the **sole developer** on this project. The product owner has zero coding experience and depends entirely on you to make every technical decision correctly the first time. Your code must be:

- **Production-ready from day 1** — no placeholders, no "TODO: implement later", no stubs
- **Self-documenting** — variable names, function names and comments must be so clear that a non-developer can understand what the code does
- **Defensively written** — validate all inputs, handle all error states, never assume external APIs will behave perfectly
- **Incrementally safe** — never break existing functionality when adding new features

---

## PROJECT OVERVIEW

**MVR Operations Hub** is a web + PWA application that serves as the operational middleware for MVR. It:

1. Provides a **single source of truth** for all property, owner, building and listing data (replacing Google Sheets and AppSheet)
2. **Visualizes** the real-time state of operations: housekeeping, maintenance, check-ins, issues
3. **Connects isolated processes** from N8N, Conduit, SuiteOp, and Breezeway into a unified, traceable workflow
4. **Exposes module-specific interfaces** for each team role, optimized for their device (desktop or mobile)

**Target users**: 10–30 internal MVR team members across 6 roles  
**Scale**: 300 units today → 1,000 units in 3 years  
**Deployment**: Vercel (frontend + API) + GCP (database + storage)  
**Repository**: GitHub with branch protection on `main`

---

## TECH STACK — NON-NEGOTIABLE

You must use exactly these technologies. Do not substitute alternatives.

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.x (App Router) | Full-stack framework. Use App Router exclusively — no Pages Router. |
| TypeScript | 5.x strict mode | All files must be `.ts` or `.tsx`. No `any` types. |
| Tailwind CSS | 3.x | All styling via utility classes. No CSS modules, no styled-components. |
| shadcn/ui | latest | Component library built on Radix UI. Install components individually as needed. |
| Zustand | 4.x | Global client state only. Server state via React Query. |
| React Query (TanStack) | 5.x | All server state, API calls, caching, optimistic updates. |
| React Hook Form | 7.x | All forms. Never use uncontrolled inputs directly. |
| Zod | 3.x | Schema validation on both client AND server. Single source of truth for types. |
| Recharts | 2.x | All charts and data visualizations. |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 14.x | All API endpoints under `/app/api/`. Route Handlers only. |
| Prisma | 5.x | ORM for all database operations. Never write raw SQL except for migrations. |
| NextAuth.js | 5.x (Auth.js) | Authentication. Google OAuth + Credentials provider. |
| Zod | 3.x | Validate every incoming API request body and query param. |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 15 on Cloud SQL (GCP) | Primary database |
| Google Cloud Storage (GCS) | File storage: photos, PDFs, floor plans |
| Cloud Memorystore (Redis) | Session cache, rate limiting, real-time state |
| GCP Secret Manager | All secrets and API keys — never in `.env` files in production |
| Vercel | Hosting and CD pipeline |
| GitHub | Version control with branch protection |
| Sentry | Error tracking and alerting |

---

## REPOSITORY STRUCTURE

Create and maintain this exact folder structure. Never deviate from it.

```
mvr-ops-hub/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + header. Auth-protected.
│   │   ├── page.tsx                ← Dashboard home / overview
│   │   ├── data-master/
│   │   │   ├── page.tsx            ← Data Master overview
│   │   │   ├── buildings/
│   │   │   │   ├── page.tsx        ← Buildings list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx    ← Building detail + edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx    ← Create building
│   │   │   ├── units/
│   │   │   ├── owners/
│   │   │   ├── listings/
│   │   │   └── contracts/
│   │   ├── customer-success/
│   │   │   ├── tickets/
│   │   │   ├── reviews/
│   │   │   └── chargebacks/
│   │   ├── operations/
│   │   │   ├── daily/
│   │   │   ├── maintenance/
│   │   │   └── inventory/
│   │   └── integrations/
│   │       └── page.tsx
│   └── api/
│       ├── webhooks/
│       │   ├── guesty/
│       │   │   └── route.ts
│       │   ├── breezeway/
│       │   │   └── route.ts
│       │   ├── suiteop/
│       │   │   └── route.ts
│       │   ├── conduit/
│       │   │   └── route.ts
│       │   └── stripe/
│       │       └── route.ts
│       └── v1/
│           ├── buildings/
│           │   └── route.ts
│           ├── units/
│           │   └── route.ts
│           ├── owners/
│           │   └── route.ts
│           └── [...]
│
├── components/
│   ├── ui/                         ← shadcn/ui generated components (DO NOT EDIT MANUALLY)
│   ├── shared/                     ← Reusable components used across modules
│   │   ├── DataTable/
│   │   │   ├── index.tsx
│   │   │   ├── columns.tsx
│   │   │   └── toolbar.tsx
│   │   ├── FileUpload/
│   │   │   └── index.tsx
│   │   ├── StatusBadge/
│   │   │   └── index.tsx
│   │   ├── ConfirmDialog/
│   │   │   └── index.tsx
│   │   ├── PageHeader/
│   │   │   └── index.tsx
│   │   └── AuditInfo/
│   │       └── index.tsx
│   └── modules/
│       ├── data-master/
│       │   ├── BuildingForm.tsx
│       │   ├── UnitForm.tsx
│       │   ├── OwnerForm.tsx
│       │   └── [...]
│       ├── customer-success/
│       └── operations/
│
├── lib/
│   ├── integrations/               ← One file per external system
│   │   ├── guesty.ts
│   │   ├── breezeway.ts
│   │   ├── stripe.ts
│   │   ├── brivo.ts
│   │   ├── slack.ts
│   │   └── n8n.ts
│   ├── db/
│   │   └── index.ts                ← Prisma client singleton
│   ├── auth/
│   │   └── index.ts                ← NextAuth config + helpers
│   ├── storage/
│   │   └── gcs.ts                  ← Google Cloud Storage client
│   ├── redis/
│   │   └── index.ts                ← Redis client singleton
│   ├── validations/                ← Zod schemas (shared client/server)
│   │   ├── building.ts
│   │   ├── unit.ts
│   │   ├── owner.ts
│   │   └── [...]
│   └── utils/
│       ├── format.ts               ← Date, currency, string formatters
│       ├── errors.ts               ← Custom error classes
│       └── webhooks.ts             ← HMAC signature verification
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   ├── manifest.json               ← PWA manifest
│   ├── icons/                      ← PWA icons (192x192, 512x512)
│   └── images/
│       └── mvr-logo.svg
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   └── integrations/
│       ├── guesty.md
│       ├── breezeway.md
│       └── [...]
│
├── .env.local                      ← Local dev only. NEVER commit.
├── .env.example                    ← Template with all required vars (no values)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                   ← Auth middleware for protected routes
├── CLAUDE.md                       ← THIS FILE. Always at root.
└── README.md
```

---

## DATABASE SCHEMA (Prisma)

This is the complete Prisma schema for the MVP (Phase 0 + Phase 1). Implement it exactly as written.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── SYSTEM ──────────────────────────────────────────────────────────────────

enum UserRole {
  super_admin
  operations_manager
  owner_relations
  cx_agent
  maintenance_tech
  housekeeping
  accounting
  read_only
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(read_only)
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts   Account[]
  sessions   Session[]
  auditLogs  AuditLog[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // CREATE | UPDATE | DELETE | LOGIN | EXPORT
  tableName  String
  recordId   String?
  oldData    Json?
  newData    Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([tableName, recordId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}

model WebhookLog {
  id         String   @id @default(cuid())
  source     String   // guesty | breezeway | suiteop | conduit | stripe | n8n
  eventType  String
  payload    Json
  status     String   @default("received") // received | processed | failed
  errorMsg   String?
  processedAt DateTime?
  createdAt  DateTime @default(now())

  @@index([source, status])
  @@index([createdAt])
  @@map("webhook_logs")
}

// ─── GEOGRAPHY ───────────────────────────────────────────────────────────────

model Country {
  id        String  @id @default(cuid())
  name      String  @unique
  isoCode   String  @db.Char(2)
  createdAt DateTime @default(now())

  states State[]

  @@map("countries")
}

model State {
  id        String  @id @default(cuid())
  name      String
  isoCode   String?
  countryId String
  createdAt DateTime @default(now())

  country   Country @relation(fields: [countryId], references: [id])
  cities    City[]

  @@map("states")
}

model City {
  id        String  @id @default(cuid())
  name      String
  stateId   String
  createdAt DateTime @default(now())

  state     State      @relation(fields: [stateId], references: [id])
  buildings Building[]

  @@map("cities")
}

// ─── BUILDINGS ────────────────────────────────────────────────────────────────

enum BuildingStatus {
  active
  inactive
  onboarding
}

model Building {
  id                  String        @id @default(cuid())
  name                String
  nickname            String?
  status              BuildingStatus @default(onboarding)
  address             String?
  zone                String?
  zipcode             String?
  lat                 Decimal?      @db.Decimal(10, 8)
  long                Decimal?      @db.Decimal(11, 8)
  googleUrl           String?
  website             String?
  imageUrl            String?
  floorplanUrls       String[]
  amenities           String[]
  checkinHours        String?
  checkoutHours       String?
  rules               String?       @db.Text
  emergencyContacts   Json?         // [{name, phone, role}]
  knowledgeBase       String?       @db.Text
  frontdeskPhone      String?
  frontdeskEmail      String?
  cityId              String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  city              City?             @relation(fields: [cityId], references: [id])
  units             Unit[]
  propertyManagers  PropertyManager[]
  contracts         OwnerContract[]

  @@index([status])
  @@index([cityId])
  @@map("buildings")
}

model PropertyManager {
  id             String   @id @default(cuid())
  buildingId     String
  name           String
  contactName    String?
  contactPhone   String?
  contactEmail   String?
  contactRole    String?
  contactArea    String?
  contactMatters String?  @db.Text
  isPrimary      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@index([buildingId])
  @@map("property_managers")
}

// ─── OWNERS ──────────────────────────────────────────────────────────────────

enum OwnerStatus {
  active
  inactive
  churned
}

enum OwnerType {
  individual
  company
}

model Owner {
  id               String      @id @default(cuid())
  uniqueId         String      @unique // LAB from AppSheet
  nickname         String
  type             OwnerType   @default(individual)
  category         String?
  personality      String?
  documentType     String?
  documentNumber   String?     // Encrypted at application layer
  phone            String?
  address          String?     @db.Text
  email            String?
  otherEmail       String?
  photoUrl         String?
  linkedin         String?
  age              Int?
  nationality      String?
  language         String      @default("en")
  siteUser         String?
  notes            String?     @db.Text
  status           OwnerStatus @default(active)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  units          Unit[]
  guestyOwner    GuestyOwner?
  contracts      OwnerContract[]

  @@index([status])
  @@map("owners")
}

model GuestyOwner {
  id              String    @id @default(cuid())
  guestyId        String    @unique
  fullName        String?
  accountId       String?
  email           String?
  ownerType       String?
  createdAtGuesty DateTime?
  ownerUniqueId   String?   @unique
  addressField9   String?
  syncedAt        DateTime  @default(now())

  owner Owner? @relation(fields: [ownerUniqueId], references: [uniqueId])

  @@map("guesty_owners")
}

// ─── UNITS ────────────────────────────────────────────────────────────────────

enum UnitStatus {
  active
  inactive
  renovation
  onboarding
}

enum UnitType {
  studio
  one_br
  two_br
  three_br
  four_br
  penthouse
  other
}

model Unit {
  id              String      @id @default(cuid())
  number          String
  floor           Int?
  line            String?
  view            String?
  type            UnitType?
  bedrooms        Int?
  bathrooms       Decimal?    @db.Decimal(3, 1)
  bathType        String?
  sqft            Int?
  mt2             Decimal?    @db.Decimal(8, 2)
  capacity        Int?
  amenityCap      Int?
  totalBeds       Int?
  kings           Int         @default(0)
  queens          Int         @default(0)
  twins           Int         @default(0)
  otherBeds       String?
  hasKitchen      Boolean     @default(false)
  hasBalcony      Boolean     @default(false)
  photoUrls       String[]
  status          UnitStatus  @default(onboarding)
  score           Decimal?    @db.Decimal(3, 1)
  notes           String?     @db.Text
  buildingId      String
  ownerUniqueId   String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  building    Building       @relation(fields: [buildingId], references: [id])
  owner       Owner?         @relation(fields: [ownerUniqueId], references: [uniqueId])
  listings    Listing[]
  contracts   OwnerContract[]
  inspections UnitInspection[]
  onboarding  OnboardingChecklist?

  @@unique([buildingId, number])
  @@index([status])
  @@index([buildingId])
  @@index([ownerUniqueId])
  @@map("units")
}

// ─── LISTINGS ────────────────────────────────────────────────────────────────

model Listing {
  id               String    @id @default(cuid())
  name             String
  guestyId         String?   @unique
  listedStatusId   String?
  groupTypeId      String?
  propertyTypeId   String?
  nickname         String?
  sqrFeet          Int?
  sqrMeter         Decimal?  @db.Decimal(8, 2)
  totalOccupancy   Int?
  activeStatusId   String?
  liveDate         DateTime?
  urlAirbnb        String?
  urlBooking       String?
  urlVrbo          String?
  urlExpedia       String?
  urlVacasa        String?
  unitId           String
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@map("listings")
}

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

model OwnerContract {
  id               String    @id @default(cuid())
  name             String
  fileUrl          String?
  startDate        DateTime?
  endDate          DateTime?
  reason           String?   @db.Text
  liveDate         DateTime?
  commission       Decimal?  @db.Decimal(5, 2)
  hasLinen         Boolean   @default(false)
  dto1yr           Decimal?  @db.Decimal(5, 2)
  dto2yr           Decimal?  @db.Decimal(5, 2)
  deposit          Decimal?  @db.Decimal(10, 2)
  regFeeDate       DateTime?
  accountNum       String?   // Encrypted
  routingNum       String?   // Encrypted
  hoa              Decimal?  @db.Decimal(10, 2)
  hasW9            Boolean   @default(false)
  hasFpl           Boolean   @default(false)
  buildingId       String?
  unitId           String?
  ownerId          String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  building   Building? @relation(fields: [buildingId], references: [id])
  unit       Unit?     @relation(fields: [unitId], references: [id])
  owner      Owner?    @relation(fields: [ownerId], references: [id])
  docs       OwnerDoc[]
  utilities  OwnerUtility[]

  @@index([unitId])
  @@index([ownerId])
  @@map("owner_contracts")
}

model OwnerDoc {
  id           String    @id @default(cuid())
  code         String
  type         String?
  startDate    DateTime?
  endDate      DateTime?
  expireDate   DateTime?
  periodicity  String?
  dueDate      DateTime?
  fileUrl      String?
  contractId   String
  createdAt    DateTime  @default(now())

  contract OwnerContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@map("owner_docs")
}

model OwnerUtility {
  id            String    @id @default(cuid())
  code          String
  type          String?
  provider      String?
  startDate     DateTime?
  accountNumber String?
  monthlyCost   Decimal?  @db.Decimal(10, 2)
  contractId    String
  createdAt     DateTime  @default(now())

  contract OwnerContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@map("owner_utilities")
}

// ─── ONBOARDING & INSPECTIONS ────────────────────────────────────────────────

enum OnboardingStage {
  initial_contact
  contract_signed
  initial_inspection
  guesty_setup
  ota_setup
  go_live
  completed
}

model OnboardingChecklist {
  id           String          @id @default(cuid())
  unitId       String          @unique
  currentStage OnboardingStage @default(initial_contact)
  completedAt  DateTime?
  notes        String?         @db.Text
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  unit  Unit               @relation(fields: [unitId], references: [id], onDelete: Cascade)
  tasks OnboardingTask[]

  @@map("onboarding_checklists")
}

model OnboardingTask {
  id             String          @id @default(cuid())
  checklistId    String
  stage          OnboardingStage
  title          String
  description    String?         @db.Text
  assignedTo     String?
  dueDate        DateTime?
  completedAt    DateTime?
  isRequired     Boolean         @default(true)
  order          Int
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  checklist OnboardingChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)

  @@index([checklistId, stage])
  @@map("onboarding_tasks")
}

model UnitInspection {
  id           String    @id @default(cuid())
  unitId       String
  inspectedBy  String
  type         String    @default("initial") // initial | periodic | checkout | owner_request
  status       String    @default("draft")   // draft | completed | shared
  overallScore Int?
  notes        String?   @db.Text
  reportUrl    String?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  unit  Unit              @relation(fields: [unitId], references: [id])
  items InspectionItem[]

  @@index([unitId])
  @@map("unit_inspections")
}

model InspectionItem {
  id           String   @id @default(cuid())
  inspectionId String
  section      String   // kitchen | bathroom | bedroom | common_areas | balcony | amenities
  itemName     String
  status       String   // ok | observation | action_required
  notes        String?
  photoUrls    String[]
  order        Int
  createdAt    DateTime @default(now())

  inspection UnitInspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)

  @@index([inspectionId])
  @@map("inspection_items")
}
```

---

## ENVIRONMENT VARIABLES

Every variable listed here is required. The app must throw a descriptive startup error if any critical variable is missing. Use this exact `.env.example`:

```bash
# ── DATABASE ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/mvr_ops_hub"
# For Cloud SQL via proxy: postgresql://user:password@/mvr_ops_hub?host=/cloudsql/PROJECT:REGION:INSTANCE

# ── AUTH ──────────────────────────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""                  # openssl rand -base64 32

GOOGLE_CLIENT_ID=""                 # GCP Console > APIs & Services > Credentials
GOOGLE_CLIENT_SECRET=""

# ── GCP ───────────────────────────────────────────────────────────────────────
GCP_PROJECT_ID=""                   # Your GCP project ID
GCS_BUCKET_NAME="mvr-ops-hub-assets"
GCS_SERVICE_ACCOUNT_KEY=""          # Base64-encoded service account JSON key
                                    # base64 -i service-account.json | tr -d '\n'

# ── REDIS ─────────────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── MONITORING ────────────────────────────────────────────────────────────────
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""                # For source map uploads

# ── INTEGRATIONS (add as each phase is developed) ────────────────────────────
GUESTY_API_KEY=""                   # Phase 2+
GUESTY_WEBHOOK_SECRET=""

BREEZEWAY_API_KEY=""                # Available NOW — Phase 4
BREEZEWAY_WEBHOOK_SECRET=""

STRIPE_SECRET_KEY=""                # Phase 3
STRIPE_WEBHOOK_SECRET=""

BRIVO_CLIENT_ID=""                  # Phase 4
BRIVO_CLIENT_SECRET=""

SLACK_BOT_TOKEN=""                  # Phase 1+ (notifications)
SLACK_SIGNING_SECRET=""

N8N_API_URL=""                      # Phase 6 (self-hosted instance URL)
N8N_API_KEY=""

SUITEOP_WEBHOOK_SECRET=""           # Phase 4
CONDUIT_WEBHOOK_SECRET=""           # Phase 2
```

---

## CODING STANDARDS — FOLLOW WITHOUT EXCEPTION

### TypeScript
```typescript
// ✅ ALWAYS — Explicit types everywhere
async function getBuilding(id: string): Promise<Building | null> { ... }

// ✅ ALWAYS — Zod for validation at API boundaries
const createBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'inactive', 'onboarding']),
  cityId: z.string().cuid().optional(),
})
type CreateBuildingInput = z.infer<typeof createBuildingSchema>

// ❌ NEVER
const data: any = req.body
function doSomething(x) { ... }
```

### API Routes (Next.js Route Handlers)
```typescript
// app/api/v1/buildings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createBuildingSchema } from '@/lib/validations/building'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['super_admin', 'operations_manager', 'owner_relations'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const buildings = await db.building.findMany({
      where: { status: { not: 'inactive' } },
      include: { city: { include: { state: { include: { country: true } } } }, _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: buildings })
  } catch (error) {
    console.error('[GET /api/v1/buildings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const validated = createBuildingSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const building = await db.building.create({ data: validated.data })

    // Audit log every write operation
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'buildings',
        recordId: building.id,
        newData: building,
      }
    })

    return NextResponse.json({ data: building }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/buildings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Webhook Handlers
```typescript
// app/api/webhooks/breezeway/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyHmacSignature } from '@/lib/utils/webhooks'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Always validate webhook signature
  const signature = req.headers.get('x-breezeway-signature') ?? ''
  const isValid = verifyHmacSignature(rawBody, signature, process.env.BREEZEWAY_WEBHOOK_SECRET!)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  // Log every webhook before processing
  await db.webhookLog.create({
    data: {
      source: 'breezeway',
      eventType: payload.event ?? 'unknown',
      payload,
      status: 'received',
    }
  })

  // Process asynchronously — respond 200 immediately to avoid timeouts
  processBreezewayWebhook(payload).catch(console.error)

  return NextResponse.json({ received: true })
}
```

### Components
```typescript
// components/modules/data-master/BuildingCard.tsx
interface BuildingCardProps {
  building: Building & {
    city: City & { state: State & { country: Country } }
    _count: { units: number }
  }
  onEdit?: (id: string) => void
}

export function BuildingCard({ building, onEdit }: BuildingCardProps) {
  // Component logic here
}
```

### File Upload to GCS
```typescript
// lib/storage/gcs.ts
import { Storage } from '@google-cloud/storage'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(
    Buffer.from(process.env.GCS_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  ),
})

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

export async function uploadFile(
  file: Buffer,
  destination: string,  // e.g., 'buildings/building-id/photos/filename.jpg'
  contentType: string
): Promise<string> {
  const fileRef = bucket.file(destination)

  await fileRef.save(file, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })

  // Return signed URL valid for 1 hour
  const [signedUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  })

  return signedUrl
}

export function getGcsPath(type: 'buildings' | 'units' | 'owners' | 'contracts' | 'inspections', id: string, filename: string): string {
  return `${type}/${id}/${filename}`
}
```

---

## DESIGN SYSTEM — EXACT TOKENS

Configure these in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mvr: {
          primary:        '#1A3C5E',
          'primary-light': '#D6E8F7',
          success:        '#1B6B3A',
          'success-light': '#D4EDDA',
          warning:        '#C05A00',
          'warning-light': '#FFF0E0',
          danger:         '#8B1A1A',
          'danger-light':  '#FDECEA',
          neutral:        '#F2F4F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### Status badge colors (use consistently everywhere)
| Status | Background | Text | Border |
|---|---|---|---|
| `active` | `mvr-success-light` | `mvr-success` | `mvr-success` |
| `onboarding` | `mvr-warning-light` | `mvr-warning` | `mvr-warning` |
| `inactive` | `mvr-neutral` | `#888` | `#ccc` |
| `renovation` | `#EEF2FF` | `#3730A3` | `#818CF8` |
| `error` / `failed` | `mvr-danger-light` | `mvr-danger` | `mvr-danger` |

---

## GIT WORKFLOW — MANDATORY

### Branch naming
```
feature/phase1-buildings-crud
feature/phase1-unit-form-mobile
feature/phase1-owner-photos-gcs
hotfix/fix-login-redirect-loop
chore/update-prisma-v5
```

### Commit format (Conventional Commits — enforced)
```
feat(buildings): add CRUD with GCS photo upload
fix(auth): resolve Google OAuth redirect loop on mobile Safari
chore(deps): update Prisma to 5.10.2
docs(breezeway): add webhook event reference
refactor(forms): extract shared FileUpload component
test(api): add integration tests for building creation
perf(db): add composite index on units(buildingId, status)
```

### Before every commit
1. `npx prisma format` — format schema
2. `npx tsc --noEmit` — check types
3. `npx eslint . --fix` — lint
4. `npx prettier --write .` — format

### Versioning
- `v1.0.0` — Data Master MVP live in production
- `v1.x.0` — new feature within Data Master
- `v1.x.x` — bug fix
- `v2.0.0` — CX module complete

---

## AUTHENTICATION SETUP

```typescript
// lib/auth/index.ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.isActive) return null

        // In production, store hashed passwords in a separate table
        // For MVP, use a simple password field or invite-only flow
        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

```typescript
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isApiWebhook = req.nextUrl.pathname.startsWith('/api/webhooks')

  // Webhooks are public (protected by HMAC)
  if (isApiWebhook) return NextResponse.next()

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect authenticated users away from login
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
```

---

## INTEGRATION CLIENTS — PATTERNS

Each external system gets its own file. Follow this pattern:

```typescript
// lib/integrations/breezeway.ts
const BREEZEWAY_BASE_URL = 'https://api.breezeway.io/v1'

async function breezeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BREEZEWAY_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.BREEZEWAY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Breezeway API error ${res.status}: ${error}`)
  }

  return res.json()
}

export const breezeway = {
  tasks: {
    list: (params?: { propertyId?: string; status?: string }) =>
      breezeRequest<BreezewayTask[]>('/tasks?' + new URLSearchParams(params as Record<string, string>)),

    create: (data: CreateBreezewayTask) =>
      breezeRequest<BreezewayTask>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    complete: (taskId: string) =>
      breezeRequest<BreezewayTask>(`/tasks/${taskId}/complete`, { method: 'PATCH' }),
  },

  properties: {
    list: () => breezeRequest<BreezewayProperty[]>('/properties'),
    get: (id: string) => breezeRequest<BreezewayProperty>(`/properties/${id}`),
  },
}
```

---

## PHASE EXECUTION PLAN

### Current Phase: PHASE 0 — Setup

**STOP. Do not start coding until you confirm:**
- [ ] GitHub repository `mvr-ops-hub` exists and you have push access
- [ ] GCP project exists with billing enabled
- [ ] Cloud SQL instance is running (PostgreSQL 15)
- [ ] `DATABASE_URL` is confirmed working with `npx prisma db push`
- [ ] Vercel project is connected to the GitHub repo

**Phase 0 completion checklist:**
- [ ] Next.js 14 project initialised with TypeScript strict mode
- [ ] shadcn/ui installed and configured with MVR design tokens
- [ ] Prisma schema pushed to Cloud SQL (all Phase 0 + Phase 1 tables)
- [ ] NextAuth working: Google login + email/password
- [ ] Dashboard layout: sidebar, header, protected routes
- [ ] PWA manifest.json configured
- [ ] Sentry installed and capturing errors
- [ ] `.env.example` documents all variables
- [ ] `README.md` has setup instructions
- [ ] Deployed to Vercel. `main` branch protection enabled.

**After Phase 0 is complete → start Phase 1: Data Master**

### Phase 1 execution order
1. Buildings CRUD (list, detail, create, edit, archive)
2. Property Managers (nested under Building detail)
3. Owners CRUD
4. Units CRUD (nested under Building, linked to Owner)
5. Listings CRUD (nested under Unit)
6. Owner Contracts + Docs + Utilities
7. Onboarding Checklist flow
8. Unit Inspection form (mobile-optimized)

---

## RULES CLAUDE CODE MUST NEVER BREAK

1. **No `any` in TypeScript.** If you don't know the type, use `unknown` and narrow it.
2. **No raw SQL.** Use Prisma. If Prisma can't do it, ask first.
3. **No secrets in code.** Every credential goes in environment variables.
4. **No skipped validation.** Every API route validates its input with Zod before touching the database.
5. **No missing error handling.** Every async function has try/catch. Every API response has proper status codes.
6. **No hard-coded IDs or strings** that should come from the database or environment.
7. **No skipped audit logs.** Every write operation (CREATE, UPDATE, DELETE) logs to `audit_logs`.
8. **No direct bucket access.** All GCS files use signed URLs with 1-hour expiry.
9. **No breaking existing tests.** Run `npx tsc --noEmit` before every commit.
10. **No new dependencies without a reason.** If you want to add a package not listed in this file, explain why first.

---

## WHEN YOU START A SESSION

1. Read this entire file.
2. Check `git status` and `git log --oneline -10` to understand where we are.
3. Ask: "We are on phase X, working on Y. Confirm to proceed?" Wait for confirmation.
4. Implement the task completely — no partial implementations.
5. After implementation: run `npx tsc --noEmit`, confirm zero TypeScript errors.
6. Commit with a proper conventional commit message.
7. Report: what was built, what was tested, what's next.

---

*MVR Operations Hub — CLAUDE.md v1.0 — April 2026*
*This file is the single source of truth for all technical decisions on this project.*
