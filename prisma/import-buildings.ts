/**
 * Imports / syncs buildings from the MVR Google Sheet to Cloud SQL.
 * Fetches the sheet directly — no manual CSV export required.
 * Run: npx tsx prisma/import-buildings.ts
 * Requires: Cloud SQL Auth Proxy running on localhost:5432
 */

import { PrismaClient, Prisma } from '@prisma/client'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1WLEQFQb_WcTpH7HS8RYxLqGfwqlScFuFErHwH_Ov3z4/export?format=csv&gid=816934862'

const db = new PrismaClient()

// ── CSV Parser ────────────────────────────────────────────────────────────────

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
      current += ch  // preserve quotes so splitCSVLine can detect quoted fields
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

  const headers = splitCSVLine(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLatLong(value: string): {
  lat: Prisma.Decimal | null
  long: Prisma.Decimal | null
} {
  if (!value?.trim()) return { lat: null, long: null }
  const parts = value.split(',')
  if (parts.length < 2) return { lat: null, long: null }
  const lat = parseFloat(parts[0].trim())
  const lng = parseFloat(parts[1].trim())
  // Guard against corrupted text in the lat/long cell
  if (isNaN(lat) || isNaN(lng)) return { lat: null, long: null }
  // Sanity-check: Miami is roughly 25.2–26.0 N, 80.0–80.5 W
  if (lat < 24 || lat > 27 || lng < -82 || lng > -79) return { lat: null, long: null }
  return { lat: new Prisma.Decimal(lat), long: new Prisma.Decimal(lng) }
}

function parseStatus(raw: string): 'active' | 'inactive' | 'onboarding' {
  const up = raw?.toUpperCase()
  if (up === 'TRUE' || up === 'ACTIVE') return 'active'
  if (up === 'FALSE' || up === 'INACTIVE') return 'inactive'
  return 'onboarding'
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📥  Fetching buildings from Google Sheets...')

  const res = await fetch(SHEET_CSV_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} — could not download sheet`)
  const csvText = await res.text()

  const rows = parseCSV(csvText)
  if (!rows.length) throw new Error('CSV is empty or could not be parsed')

  const cols = Object.keys(rows[0]).join(', ')
  console.log(`📋  ${rows.length} row(s) · columns: ${cols}\n`)

  const miami = await db.city.findFirst({ where: { name: 'Miami' } })
  if (!miami) {
    throw new Error(
      'Miami city not found in DB. Run the seed first:\n  npm run db:seed'
    )
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const id = row['building_id']
    const name = row['building_name']

    if (!id || !name) {
      console.warn('  ⚠  Skipping row — missing id or name:', JSON.stringify(row))
      skipped++
      continue
    }

    const { lat, long } = parseLatLong(row['building_lat_long'] ?? '')
    if (!lat) {
      console.warn(`  ⚠  "${name}" — lat/long could not be parsed, skipping coordinates`)
    }

    const floorplanPath = row['building_floorplans']?.trim()

    const data = {
      name,
      nickname:      row['building_nickname']  || null,
      status:        parseStatus(row['building_status']),
      address:       row['building_address']   || null,
      zone:          row['building_zone']       || null,
      zipcode:       row['building_zipcode']    || null,
      lat,
      long,
      googleUrl:     row['building_google']     || null,
      imageUrl:      row['building_image']      || null,
      website:       row['building_website']    || null,
      floorplanUrls: floorplanPath ? [floorplanPath] : ([] as string[]),
      cityId:        miami.id,
    }

    const existing = await db.building.findUnique({ where: { id } })

    await db.building.upsert({
      where:  { id },
      create: { id, ...data },
      update: data,
    })

    if (existing) {
      console.log(`  ↻  Updated: ${name}`)
      updated++
    } else {
      console.log(`  ✓  Created: ${name}`)
      created++
    }
  }

  console.log(
    `\n✅  Done — ${created} created · ${updated} updated · ${skipped} skipped`
  )
}

main()
  .catch(err => {
    console.error('❌', err.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
