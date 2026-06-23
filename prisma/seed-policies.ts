// Seeds the 8 PolicyContent rows (4 OTAs × {review, general}) the Dispute Tool's
// Policies module shows by default. Agents can later overwrite any section via the
// "Update policy" flow. Self-contained (only @prisma/client) so it runs under tsx
// without path-alias resolution.
// Run: npm run db:seed:policies
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

type Item = { title: string; detail: string }
type PolicyJson = { review?: Item[]; general_guests?: Item[]; general_hosts?: Item[] }

// Minimal HTML renderer mirroring lib/disputes/policies.ts (kept inline to avoid
// the @/ alias under tsx).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function renderItems(items: Item[]): string {
  return items
    .map(
      (it) =>
        `<li class="policy-item"><span class="policy-item-title">${escapeHtml(
          it.title
        )}</span><span class="policy-item-detail">${escapeHtml(it.detail)}</span></li>`
    )
    .join('')
}
function renderPolicyHtml(json: PolicyJson): string {
  const blocks: string[] = []
  if (json.review?.length) blocks.push(`<ul class="policy-list">${renderItems(json.review)}</ul>`)
  if (json.general_guests?.length)
    blocks.push(
      `<h4 class="policy-subhead">Guests</h4><ul class="policy-list">${renderItems(json.general_guests)}</ul>`
    )
  if (json.general_hosts?.length)
    blocks.push(
      `<h4 class="policy-subhead">Hosts</h4><ul class="policy-list">${renderItems(json.general_hosts)}</ul>`
    )
  return blocks.join('') || '<p class="policy-empty">No policy content yet.</p>'
}

type Ota = 'airbnb' | 'booking' | 'vrbo' | 'expedia'

// Starter content. Intentionally brief — real content is filled via "Update policy".
const SEED: Record<Ota, { review: PolicyJson; general: PolicyJson }> = {
  airbnb: {
    review: {
      review: [
        { title: 'Irrelevant', detail: 'Reviews unrelated to the stay or the listing can be removed.' },
        { title: 'Bias / extortion', detail: 'Reviews tied to coercion, pressure or extortion are removable.' },
        { title: 'Content policy', detail: 'PII, discriminatory or explicit content violates policy and is removable.' },
      ],
    },
    general: {
      general_guests: [
        { title: 'AirCover for guests', detail: 'Guest protections if the listing materially differs from the booking.' },
      ],
      general_hosts: [
        { title: 'AirCover for hosts', detail: 'Host damage protection and liability coverage per Airbnb terms.' },
      ],
    },
  },
  booking: {
    review: {
      review: [
        { title: 'PII / privacy', detail: 'Reviews exposing personal data are eligible for removal.' },
        { title: 'Irrelevant / misleading', detail: 'Content not reflecting a genuine stay can be challenged.' },
        { title: 'Cancellation rule', detail: 'Reviews from guests who cancelled before check-in may be removed.' },
      ],
    },
    general: {
      general_guests: [
        { title: 'Guest misconduct', detail: 'Reportable via the Extranet for property damage or abuse.' },
      ],
      general_hosts: [
        { title: 'Extranet routing', detail: 'Disputes and review challenges are routed through the partner Extranet.' },
      ],
    },
  },
  vrbo: {
    review: {
      review: [
        { title: 'Extortion / coercion', detail: 'Reviews tied to threats or coercion are removable.' },
        { title: 'Prohibited information', detail: 'Real address or rate disclosures are removable.' },
        { title: 'Inaccuracy', detail: 'Reviews lacking direct relation to the stay can be challenged.' },
      ],
    },
    general: {
      general_guests: [
        { title: 'Guest rules', detail: 'Sections 1 & 2 of the guest rules govern conduct and eligibility.' },
      ],
      general_hosts: [
        { title: 'As-is operation', detail: 'VRBO does not mediate opinion disputes (Section 8).' },
      ],
    },
  },
  expedia: {
    review: {
      review: [
        { title: 'Eligibility window', detail: 'Reviews outside the 6-month window are ineligible.' },
        { title: 'Fake / fraudulent', detail: 'Fraudulent or non-first-hand reviews can be removed.' },
        { title: 'AI-generated', detail: 'AI-generated review content is removable.' },
      ],
    },
    general: {
      general_guests: [
        { title: 'Attempted stays', detail: 'Guests who attempted to stay may still review.' },
      ],
      general_hosts: [
        { title: 'Incentivized reviews', detail: 'Properly labelled incentivized reviews are not removable.' },
      ],
    },
  },
}

async function main() {
  console.log('🌱 Seeding dispute policy content...')
  const otas: Ota[] = ['airbnb', 'booking', 'vrbo', 'expedia']

  for (const ota of otas) {
    for (const section of ['review', 'general'] as const) {
      const json = SEED[ota][section]
      const contentHtml = renderPolicyHtml(json)
      await db.policyContent.upsert({
        where: { ota_section: { ota, section } },
        update: {}, // do not clobber agent edits on re-seed
        create: {
          ota,
          section,
          contentJson: json,
          contentHtml,
          sourceUrl: null,
          updatedById: null,
        },
      })
      console.log(`  ✓ ${ota} / ${section}`)
    }
  }
  console.log('✅ Policy content seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
