/**
 * scripts/assign-unit-owners-from-notion.ts
 *
 * Cross-references the Notion "Unit Directory" CSV export against Data Master
 * units and assigns each unit's owner (Unit.ownerUniqueId -> Owner.id).
 *
 * Join rule: match on BUILDING + the first-4-digit base of the unit number.
 * A Data Master master unit may be split into keys ("0901-1", "0901-2") while
 * Notion only lists the base ("901"). So one Notion row assigns its owner to
 * EVERY Data Master unit in that building whose base (number.split('-')[0])
 * equals the Notion unit number, zero-padded to 4 digits.
 *
 * Owner resolution: Notion's free-text "Owner" is matched against Owner.nickname
 * (accent-insensitive, whitespace-collapsed). nickname is NOT unique, so:
 *   - 0 matches  -> "owner not found"  (skip + report)
 *   - >1 matches -> "owner ambiguous"  (skip + report)
 * Owners are NEVER created by this script.
 *
 * Existing owner on a unit: OVERWRITTEN with the Notion owner where matched
 * (the previous owner is flagged under "overwritten conflicts").
 *
 * Dry run (default — prints the full report, writes NOTHING):
 *   npx tsx --env-file=.env.local scripts/assign-unit-owners-from-notion.ts
 * Apply the assignments:
 *   npx tsx --env-file=.env.local scripts/assign-unit-owners-from-notion.ts --apply
 * Custom CSV path:
 *   ... scripts/assign-unit-owners-from-notion.ts --file=path/to/export.csv
 *
 * Requires the Cloud SQL proxy running and DATABASE_URL in .env.local.
 * No audit-log rows are written (bulk maintenance-script convention; scripts
 * have no session user, which AuditLog.userId requires).
 */

import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const FILE_ARG = process.argv.find((a) => a.startsWith('--file='))
const CSV_PATH = FILE_ARG ? FILE_ARG.slice('--file='.length) : 'prisma/notion-units.csv'

/**
 * Maps a Notion "Building" label to a Data Master building name or nickname,
 * for any label that does not already match a building by name/nickname.
 * Fill this in after the first dry-run if a building is reported unmapped.
 *   e.g. 'District 225': 'District'
 */
const BUILDING_ALIASES: Record<string, string> = {
  'Hotel Arya': 'Arya', // Notion labels it "Hotel Arya"; Data Master nickname is "Arya"
}

// ── CSV parser (copied from prisma/import-buildings.ts) ─────────────────────

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch // preserve quotes so splitCSVLine can detect quoted fields
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current)
      current = ''
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0]).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

// ── Normalizers ─────────────────────────────────────────────────────────────

/** Lowercase, strip accents, collapse whitespace — for owner-name / building matching. */
function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Notion unit number ("901", "901.0", "3409") -> 4-digit zero-padded base ("0901", "3409"). */
function toBase(unitNumber: string): string | null {
  const digits = unitNumber.trim().split('.')[0].replace(/[^\d]/g, '')
  if (!digits) return null
  return digits.padStart(4, '0')
}

/** Data Master unit number -> its base (part before the first dash). */
function unitBase(number: string): string {
  return number.split('-')[0]
}

// ── Types ────────────────────────────────────────────────────────────────────

interface UnitRow {
  id: string
  number: string
  buildingId: string
  ownerUniqueId: string | null
  ownerNickname: string | null
}

interface Assignment {
  unitId: string
  building: string
  number: string
  ownerId: string
  ownerName: string
  previousOwner: string | null // set only when overwriting a different owner
}

interface SkippedRow {
  building: string
  unit: string
  owner: string
  reason: string
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found at "${CSV_PATH}". Pass --file=<path> or place it there.`)
  }
  const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'))
  if (!rows.length) throw new Error('CSV is empty or could not be parsed.')

  const [buildings, units, owners] = await Promise.all([
    db.building.findMany({ select: { id: true, name: true, nickname: true } }),
    db.unit.findMany({
      select: {
        id: true,
        number: true,
        buildingId: true,
        ownerUniqueId: true,
        owner: { select: { nickname: true } },
      },
    }),
    db.owner.findMany({ select: { id: true, nickname: true } }),
  ])

  // Building lookup: normalized name/nickname -> building.
  const buildingByKey = new Map<string, { id: string; label: string }>()
  for (const b of buildings) {
    const label = b.nickname || b.name
    buildingByKey.set(normName(b.name), { id: b.id, label })
    if (b.nickname) buildingByKey.set(normName(b.nickname), { id: b.id, label })
  }
  const resolveBuilding = (notionLabel: string): { id: string; label: string } | null => {
    const alias = BUILDING_ALIASES[notionLabel.trim()]
    if (alias) return buildingByKey.get(normName(alias)) ?? null
    return buildingByKey.get(normName(notionLabel)) ?? null
  }

  // Owner lookup: normalized nickname -> owners (array reveals ambiguity).
  const ownersByName = new Map<string, { id: string; nickname: string }[]>()
  for (const o of owners) {
    const key = normName(o.nickname)
    const arr = ownersByName.get(key)
    if (arr) arr.push(o)
    else ownersByName.set(key, [o])
  }

  // Units grouped by building -> base -> units.
  const unitsByBuildingBase = new Map<string, UnitRow[]>()
  for (const u of units) {
    const key = `${u.buildingId}::${unitBase(u.number)}`
    const row: UnitRow = {
      id: u.id,
      number: u.number,
      buildingId: u.buildingId,
      ownerUniqueId: u.ownerUniqueId,
      ownerNickname: u.owner?.nickname ?? null,
    }
    const arr = unitsByBuildingBase.get(key)
    if (arr) arr.push(row)
    else unitsByBuildingBase.set(key, [row])
  }

  // ── Process rows ──
  const assignments: Assignment[] = []
  let alreadyCorrect = 0

  const buildingUnmapped: SkippedRow[] = []
  const noOwnerInNotion: SkippedRow[] = []
  const ownerNotFound: SkippedRow[] = []
  const ownerAmbiguous: SkippedRow[] = []
  const noMatchingUnit: SkippedRow[] = []
  const unmappedBuildingLabels = new Set<string>()

  for (const r of rows) {
    const notionBuilding = (r['Building'] ?? '').trim()
    const notionUnit = (r['Unit Number'] ?? '').trim()
    const notionOwner = (r['Owner'] ?? '').trim()
    const skip = (reason: string): SkippedRow => ({
      building: notionBuilding || '(blank)',
      unit: notionUnit || '(blank)',
      owner: notionOwner || '(blank)',
      reason,
    })

    const building = resolveBuilding(notionBuilding)
    if (!building) {
      unmappedBuildingLabels.add(notionBuilding || '(blank)')
      buildingUnmapped.push(skip('building not found in Data Master'))
      continue
    }

    if (!notionOwner) {
      noOwnerInNotion.push(skip('no owner listed in Notion'))
      continue
    }

    const matches = ownersByName.get(normName(notionOwner)) ?? []
    if (matches.length === 0) {
      ownerNotFound.push(skip('owner nickname not found in Data Master'))
      continue
    }
    if (matches.length > 1) {
      ownerAmbiguous.push(skip(`${matches.length} owners share this nickname`))
      continue
    }
    const owner = matches[0]

    const base = toBase(notionUnit)
    const targets = base ? unitsByBuildingBase.get(`${building.id}::${base}`) ?? [] : []
    if (targets.length === 0) {
      noMatchingUnit.push(skip(`no unit with base "${base ?? '?'}" in ${building.label}`))
      continue
    }

    for (const u of targets) {
      if (u.ownerUniqueId === owner.id) {
        alreadyCorrect++
        continue
      }
      assignments.push({
        unitId: u.id,
        building: building.label,
        number: u.number,
        ownerId: owner.id,
        ownerName: owner.nickname,
        previousOwner: u.ownerUniqueId ? u.ownerNickname ?? '(unknown owner)' : null,
      })
    }
  }

  const conflicts = assignments.filter((a) => a.previousOwner !== null)

  // ── Report ──
  const line = '─'.repeat(70)
  console.log(`\n${line}`)
  console.log(`Notion → Data Master owner assignment  ${APPLY ? '(APPLY)' : '(DRY RUN)'}`)
  console.log(`CSV: ${CSV_PATH}`)
  console.log(line)
  console.log(`Rows read              : ${rows.length}`)
  console.log(`Units to assign        : ${assignments.length}  (of which overwrites: ${conflicts.length})`)
  console.log(`Already correct        : ${alreadyCorrect}`)
  console.log(`Skipped — no owner     : ${noOwnerInNotion.length}`)
  console.log(`Skipped — owner missing: ${ownerNotFound.length}`)
  console.log(`Skipped — owner ambig. : ${ownerAmbiguous.length}`)
  console.log(`Skipped — no unit      : ${noMatchingUnit.length}`)
  console.log(`Skipped — bad building : ${buildingUnmapped.length}`)

  console.log(`\nBuildings mapped:`)
  for (const b of buildings) console.log(`  ✓ ${b.nickname || b.name}`)
  if (unmappedBuildingLabels.size) {
    console.log(`\n⚠ Notion building labels NOT mapped (add to BUILDING_ALIASES):`)
    for (const l of unmappedBuildingLabels) console.log(`  ✗ ${l}`)
  }

  const dump = (title: string, list: SkippedRow[]) => {
    if (!list.length) return
    console.log(`\n${title} (${list.length}):`)
    for (const s of list) console.log(`  [${s.building}] unit ${s.unit} · owner "${s.owner}" — ${s.reason}`)
  }
  dump('OWNER NOT FOUND', ownerNotFound)
  dump('OWNER AMBIGUOUS', ownerAmbiguous)
  dump('NO MATCHING UNIT', noMatchingUnit)
  dump('BUILDING UNMAPPED', buildingUnmapped)

  if (conflicts.length) {
    console.log(`\nOVERWRITTEN CONFLICTS (${conflicts.length}) — existing owner replaced:`)
    for (const a of conflicts) {
      console.log(`  [${a.building}] ${a.number}: "${a.previousOwner}" → "${a.ownerName}"`)
    }
  }

  if (assignments.length) {
    console.log(`\nASSIGNMENTS (${assignments.length}):`)
    for (const a of assignments) {
      const tag = a.previousOwner !== null ? ' (overwrite)' : ''
      console.log(`  [${a.building}] ${a.number} → "${a.ownerName}"${tag}`)
    }
  }

  if (!APPLY) {
    console.log(`\n${line}`)
    console.log('DRY RUN — nothing was written. Re-run with --apply to perform the ASSIGNMENTS above.')
    console.log(line)
    return
  }

  console.log(`\nAPPLYING…`)
  let ok = 0
  let failed = 0
  for (const a of assignments) {
    try {
      await db.unit.update({ where: { id: a.unitId }, data: { ownerUniqueId: a.ownerId } })
      ok++
    } catch (e) {
      failed++
      console.error(`  FAILED [${a.building}] ${a.number} → "${a.ownerName}":`, e instanceof Error ? e.message : e)
    }
  }
  console.log(`\nDone. Assigned ${ok}, failed ${failed}. (${alreadyCorrect} already correct, unchanged.)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
