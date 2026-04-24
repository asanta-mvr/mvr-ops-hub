/**
 * scripts/import-units.ts
 * Full upsert of all units from the AppSheet source CSV into Cloud SQL.
 *
 * What this script does:
 *  - Parses all 27 CSV columns (unit_id through listing_id)
 *  - Stores photoQuality from the unit_photos column (Pro, Preliminary, etc.)
 *  - Programmatically resolves duplicate unit numbers per building (appends b/c/d suffixes)
 *  - Upserts by unit_id so it is safe to re-run at any time
 *  - Columns 25 (owner_id) and 26 (listing_id) are Guesty external IDs — parsed but
 *    not persisted; they are managed via the Guesty integration layer
 *
 * Prerequisites:
 *  - Cloud SQL Auth Proxy running: cloud-sql-proxy miami-vr-data:us-east1:mvr-ops-hub-db
 *  - Prisma migration applied: npx prisma migrate dev --name add_unit_photo_quality
 *
 * Run:
 *   npx ts-node -P tsconfig.json scripts/import-units.ts
 *
 * Building ID map (IDs are native short IDs seeded directly into the DB):
 *   6b274e4f → Hotel Arya
 *   3b08b87b → The Elser
 *   f9d8eb15 → Icon Brickell
 *   b6625228 → Natiivo
 */

import { PrismaClient, UnitType, UnitStatus } from '@prisma/client'

const db = new PrismaClient()

// ─── CSV parser (handles quoted fields with embedded commas) ──────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) break
    if (line[i] === '"') {
      i++
      let value = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { value += '"'; i += 2 }
          else { i++; break }
        } else { value += line[i++] }
      }
      fields.push(value)
      if (i < line.length && line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { fields.push(line.slice(i)); break }
      fields.push(line.slice(i, end))
      i = end + 1
    }
  }
  return fields
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function toNum(v: string): number | null {
  const s = v.trim().replace(',', '.')
  if (!s || s === '#VALUE!') return null
  const n = parseFloat(s)
  if (isNaN(n) || n === 0) return null
  return n
}

function toInt(v: string): number | null {
  const n = parseInt(v.trim(), 10)
  return isNaN(n) ? null : n
}

function safeInt(v: string): number {
  const n = parseInt(v.trim(), 10)
  return isNaN(n) ? 0 : n
}

function parseBedrooms(v: string): number | null {
  const s = v.trim()
  if (s.includes('+')) return 1  // "1+den" → 1 bedroom
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function parseKitchen(v: string): boolean {
  return ['yes', 'kitchennette', 'kitchenette'].includes(v.trim().toLowerCase())
}

function parseBalcony(v: string): boolean {
  return v.trim().toLowerCase() === 'yes'
}

function inferType(br: number | null): UnitType | null {
  if (br === 0) return UnitType.studio
  if (br === 1) return UnitType.one_br
  if (br === 2) return UnitType.two_br
  if (br === 3) return UnitType.three_br
  if (br !== null && br >= 4) return UnitType.four_br
  return null
}

function inferStatus(notes: string, photoQuality: string): UnitStatus {
  const n = notes.toLowerCase()
  if (n.includes('renovaci')) return UnitStatus.renovation
  if (n.includes('ya no lo manejamos') || n.includes('van a vender')) return UnitStatus.inactive
  const p = photoQuality.toLowerCase()
  if (p === 'preliminary' || p === 'no photos') return UnitStatus.onboarding
  return UnitStatus.active
}

// ─── Source CSV (27 columns) ──────────────────────────────────────────────────
// Columns: unit_id(0), unit_number(1), unit_floor(2), unit_line(3), unit_view(4),
//   unit_type(5,ignored), unit_bedrooms(6), unit_bathrooms(7), unit_bath_type(8),
//   unit_sqft(9), unit_mt2(10), unit_capacity(11), unit_amenity_cap(12),
//   unit_beds(13), unit_kings(14), unit_queen(15), unit_twin(16),
//   unit_kitchen(17), unit_balcony(18), unit_photos→photoQuality(19),
//   unit_status(20,always TRUE,ignored), unit_score(21), unit_comment(22),
//   building_id(23), owner_uniqueId(24), owner_id(25,ref only), listing_id(26,ref only)

const CSV = `unit_id,unit_number,unit_floor,unit_line,unit_view,unit_type,unit_bedrooms,unit_bathrooms,unit_bath_type,unit_sqft,unit_mt2,unit_capacity,unit_amenity_cap,unit_beds,unit_kings,unit_queen,unit_twin,unit_kitchen,unit_balcony,unit_photos,unit_status,unit_score,unit_comment,building_id,owner_uniqueId,owner_id,listing_id
6310aa83,1908-01,19,Line 08.01,Partial Bay / City,Single,0,1,Shower,943,87.6,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,7b2c8ac0,,
b8813135,0905-02,9,Line 05.02,City,Share,0,1,Bathtub,370,34.4,2,4,1,1,0,0,Yes,Yes,Low Quality,TRUE,8,This unit is pending on X,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
682c09ba,1901,19,Line 01,Bay,,2,2.5,Shower,1315,122.2,6,6,3,2,0,0,Yes,Yes,Pro,TRUE,5,,6b274e4f,01efa4ff,68378b2a3fbb6747fc9ade20,
c7a398f3,1017,10,Line 17,City / Partial Bay,,2,2.5,Shower,255,23.7,2,6,1,1,0,0,No,No,Pro,TRUE,4,,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,
3f8bdf8a,1503,15,Line 03,Partial Bay / City,,0,1,Bathtub,723,67.2,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,4.5,,6b274e4f,,,
27852c1e,1518-01,15,Line 18.01,Bay,,0,1,Shower,255,23.7,2,2,1,1,0,0,No,No,Pro,TRUE,10,,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
a9bb77ec,0901-02,9,Line 01.02,Bay,,1,1,Tub,398,37,4,4,2,0,2,0,Kitchennette,Yes,Pro,TRUE,2,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
a3b869a2,0904-01,9,Line 04.01,No view,,0,1,Bathtub,350,32.5,2,2,1,1,0,0,Yes,No,Preliminary,TRUE,10,Esta en renovaciones.   .1406.01 Kitchenette - No stove,6b274e4f,682bd54d,68378b2d70c94cf2ee08bc08,
00b9c1cf,1618-02,16,Line 18.02,Bay,,1,1.5,Tub,401,37.3,4,4,2,0,2,0,Kitchennette,Yes,Preliminary,TRUE,10,Esta en renovaciones.,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
6169c390,2004-01,20,Line 04.01,City,,0,1,Bathtub,390,36.2,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,6876bcbdf94252e640eac6b0,
61993dcc,1714,17,Line 14,Bay / Pool,,1,1.5,Bathtub,255,23.7,2,4,1,1,0,0,No,No,Pro,TRUE,10,,6b274e4f,f77c1557,,
c4a1e997,1812-02,18,Line 12.02,City,,0,1,Shower,1098,102,6,4,3,2,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
cb275d7b,2004-02,20,Line 04.02,Bay / Pool,,0,1.5,Shower,842,78.2,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,,
d8407eba,1705-01,17,Line 05.01,Partial Bay / City,,0,1,Tub,398,37,4,2,2,0,2,0,Kitchennette,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,6876bb1f7c443691a6d179dc,
86539109,2005-01,20,Line 05.01,Partial Bay / City,,0,1,,330,30.7,4,2,2,1,0,0,No,Yes,Pro,TRUE,10,Ya no lo manejamos,6b274e4f,7ec19a5d,,
aa448b32,1017-01,10,Line 17.01,City,,0,1,Bathtub,365,33.9,2,2,1,1,0,0,Kitchennette,Yes,Preliminary,TRUE,10,Esta en renovaciones.,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,
c3dd7501,1801-02,18,Line 01.02,Bay,,1,1,Bathtub,963,89.5,6,4,3,2,0,0,Yes,Yes,Preliminary,TRUE,10,Pro viejas,6b274e4f,e448667e,6924c667c764b2469865b79b,
017940c0,1908-02,19,Line 08.02,Partial Bay / City,,0,1,Bathtub,255,23.7,2,4,1,1,0,0,No,No,Preliminary,TRUE,10,Pro viejas,6b274e4f,f0e75a2b,68378b1f70c94cf2ee08bafa,
4754d0b7,2008-01,20,Line 08.01,Partial Bay / City,,0,1,Bathtub,401,37.3,4,2,3,1,0,2,Kitchennette,Yes,Low Quality,TRUE,10,Faltan unas pequeñas renovaciones,6b274e4f,f77c1557,68378b1f70c94cf2ee08bafa,
f3f2e361,1618,16,Line 18,Bay,,2,2.5,Shower,693,64.4,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
60ed5cef,1901-01,19,Line 01.01,Partial Bay / City,,0,1,Shower,963,89.5,6,2,3,2,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,01efa4ff,68378b2a3fbb6747fc9ade20,
d030eab2,1409,14,Line 09,Partial Bay / City,,0,1,Shower,255,23.7,2,4,1,1,0,0,No,No,Pro,TRUE,10,,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
b95387a3,1701,17,Line 01,Bay,,2,2.5,Shower,710,66,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,03929529,68378b263fbb6747fc9addb9,
6a77b1b9,1717,17,Line 17,City / Partial Bay,,2,2.5,Bathtub,330,30.7,2,6,1,1,0,0,No,Yes,Pro,TRUE,10,Very small twin chair/bed,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
5bcea3cf,1218-02,12,Line 18.02,Bay,,1,1.5,Bathtub,390,36.2,2,4,1,1,0,0,Yes,Yes,Pro,TRUE,10,Very small twin chair/bed,6b274e4f,5210eca4,68378b4b70c94cf2ee08c09a,
b6454717,1618-01,16,Line 18.01,Bay,,0,1,Shower,693,64.4,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
7ed03f8a,1508-01,15,Line 08.01,Partial Bay / City,,0,1,Bathtub,240,22.3,2,2,1,1,0,0,No,No,Preliminary,TRUE,10,Esta en renovaciones.,6b274e4f,,,
f5ea343d,2007,20,Line 07,Partial Bay / City,,0,1,Bathtub,723,67.2,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,Esta en renovaciones.,6b274e4f,2e809f15,68378b2c3fbb6747fc9ade63,
40d78f39,1804-02,18,Line 04.02,Bay / Pool,,0,1,Shower,256,23.8,2,4,1,1,0,0,No,No,Pro,TRUE,10,,6b274e4f,01a5f240,,
218849ec,1614,16,Line 14,Bay / Pool,,1,1.5,Tub,264,24.5,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,f4ef9339,68dc0865b9a22990be3b06b4,
928b2406,0912-02,9,Line 12.02,City,,0,1,Tub,430,39.9,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,,,
3046cfa4,1504-01,15,Line 04.01,Bay / Pool,,0,1,Shower,390,36.2,4,2,2,1,0,0,No,Yes,Pro,TRUE,10,,6b274e4f,96e0640a,,
f65a6474,1218-01,12,Line 18.01,Bay,,0,1,Shower,330,30.7,3,2,2,1,0,1,Yes,Yes,Pro,TRUE,10,"1808.02 / Very small twin chair/bed",6b274e4f,5210eca4,68378b4b70c94cf2ee08c09a,
fbac9ebd,1002-01,10,Line 02.01,Partial Bay / Pool,,0,1,Shower,401,37.3,4,2,2,1,0,0,Kitchennette,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,6876bcbdf94252e640eac6b0,
6d1b73b4,0912-01,9,Line 12.01,City,,0,1,Bathtub,300,27.9,2,2,1,1,0,0,No,No,Preliminary,TRUE,10,Esta en renovaciones.,6b274e4f,,,
ab060637,2018-01,20,Line 18.01,Bay,,0,1,Shower,256,23.8,2,2,1,1,0,0,No,No,Pro,TRUE,10,,6b274e4f,7a768d63,68378b2d3fbb6747fc9adeb2,
9d318430,1701-02,17,Line 01.02,Bay,,1,1,Bathtub,330,30.7,4,4,3,1,0,2,No,Yes,Pro,TRUE,10,,6b274e4f,03929529,68378b263fbb6747fc9addb9,
2cc586c9,1518,15,Line 18,Bay,,2,2.5,Shower,1098,102,6,6,3,2,0,0,Yes,Yes,Preliminary,TRUE,10,Esperando papel tapiz,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
fa12c30f,2017,20,Line 17,City / Partial Bay,,2,1.5,Shower,842,78.2,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,Esperando papel tapiz,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
cb2bbcae,0902-01,9,Line 02.01,Partial Bay / Pool,,0,1,Bathtub,397,36.9,4,2,2,0,2,0,Kitchennette,Yes,Pro,TRUE,10,"Tienen marca de agua, toca ponerlas raw. owner lo pidio NO QUITAR",6b274e4f,7b2c8ac0,6977caf1a36dd831520120cf,
dbc45467,1418-01,14,Line 18.01,Bay,,0,1,Bathtub,390,36.2,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,Steve,6b274e4f,dcf621fe,6876bcbdf94252e640eac6b0,
8174089e,2001-02,20,Line 01.02,Bay,,1,1,Bathtub,723,67.2,6,4,3,2,0,0,Yes,Yes,Pro,TRUE,10,Faltan unas cositas,6b274e4f,a9f5ba3d,68378b2b70c94cf2ee08bbe1,
34561055,1501,15,Line 01,Bay,,2,2.5,Shower,,0,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,"Doesnt have a door that divides the room, only a hallway",6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
5488d1eb,1406-02,14,Line 06.02,Bay / Pool,,0,1,Shower,,,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
fbcefb26,1608,16,Line 08,Partial Bay / City,,1,2,Shower,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,0eda0428,68378b2570c94cf2ee08bb80,
9f1b6d49,2001-01,20,Line 01.01,Partial Bay / City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,"ADA - Doesnt have a door that divides the room, only a hallway",6b274e4f,a9f5ba3d,68378b2b70c94cf2ee08bbe1,
cc96a45d,0902-02,9,Line 02.02,Bay,,1,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Low Quality,TRUE,10,,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
5a290524,2017-01,20,Line 17.01,City,,0,1,Shower,,0,8,2,4,1,2,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
4276e8ee,0902,9,Line 02,Bay,,2,2.5,Shower,,0,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,7b2c8ac0,6977caf1a36dd831520120cf,
e1b70f93,2105-01,21,Line 05.01,Partial Bay / City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,"Doesnt have a door that divides the room, only a hallway",6b274e4f,,,
f014c55c,1606-01,16,Line 06.01,Partial Bay / Pool,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,No Photos,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
4f272c62,1812-01,18,Line 12.01,City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
917632fb,1403,14,Line 03,Partial Bay / City,,0,1,Shower,,0,8,4,4,1,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,f0e75a2b,68378b1f70c94cf2ee08bafa,
182b7a4c,0904-01,9,Line 04.01,Bay / Pool,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Model Apt,TRUE,10,,6b274e4f,682bd54d,68378b2d70c94cf2ee08bc08,
21163aa2,1418-02,14,Line 18.02,Bay,,1,1.5,Shower,,0,6,4,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,dcf621fe,6876bb1f7c443691a6d179dc,6806b1b64ed13700105ee74b
6061bb1f,2005-01,20,Line 05.01,Partial Bay / City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,7ec19a5d,68378b2b3fbb6747fc9ade47,
af67bdd9,2017-02,20,Line 17.02,City / Partial Bay,,1,1.5,Shower,,0,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
152cd730,1017-02,10,Line 17.02,City / Partial Bay,,1,1.5,Shower,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,6806b12b6a369700119cc07f
15ba9d49,1404,14,Line 04,Bay / Pool,,1,1,Shower,,0,6,4,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,,,
14c99877,1004-01,10,Line 04.01,Bay / Pool,,0,1,Shower,,0,8,2,4,1,1,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,68378b1e70c94cf2ee08bab4,68378b1e70c94cf2ee08bab4,
8c7e38ca,1717-01,17,Line 17.01,City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,"Doesnt have a door that divides the room, only a hallway",6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
f414ac62,1808-01,18,Line 08.01,Partial Bay / City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,
bd177c3e,1809,18,Line 09,Partial Bay / City,,0,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,,,
6f4545a9,1701-01,17,Line 01.01,Partial Bay / City,,0,1,Shower,,0,6,2,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,03929529,68378b263fbb6747fc9addb9,
782fe73f,1002,10,Line 02,Bay,,2,"2,5",Shower,,0,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,"ADA - Doesnt have a door that divides the room, only a hallway",6b274e4f,dcf621fe,6876bb1f7c443691a6d179dc,
c240ec6a,1605-01,16,Line 05.01,Partial Bay / City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
ddc64daf,2018,20,Line 18,Bay,,2,2.5,Tub,,0,5,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,Tiene otro sofa cama pero no se usa...,6b274e4f,7a768d63,68378b2d3fbb6747fc9adeb2,
72625589,1708-02,17,Line 08.02,Partial Bay / City,,0,1,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,5789b951,,
83a13aa0,1708-01,17,Line 08.01,Partial Bay / City,,0,1,Tub,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,5789b951,,
f6d65321,1418,14,Line 18,Bay,,2,2.5,,,0,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,6876bb1f7c443691a6d179dc,6806b0cc0e38f300137fb86a
3c4e3233,1504-02,15,Line 04.02,Bay / Pool,,0,1,,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,96e0640a,68a48f177394e8c2ce3b97cf,
f34f314c,1508-02,15,Line 08.02,Partial Bay / City,,0,1,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,,,
3bd83f31,1605-02,16,Line 05.02,Partial Bay / City,,0,1,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
c400159c,1804-01,18,Line 04.01,Bay / Pool,,0,1,Tub,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,01a5f240,68378b283fbb6747fc9adde8,
db13876a,2008-02,20,Line 08.02,Partial Bay / City,,0,1,Both,,0,6,4,3,1,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,f77c1557,,
1ed730c1,1715,17,Line 15,City,,0,1,,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,No quieren gastar en fotos,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,
7e02d474,2105-02,21,Line 05.02,Partial Bay / City,,0,1,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,,,
d606df55,1002-02,10,Line 02.02,Bay,,1,1,Both,,0,4,4,3,1,0,2,Yes,Yes,Pro,TRUE,10,,6b274e4f,dcf621fe,6876bb1f7c443691a6d179dc,
b0b7498a,1703,17,Line 03,Partial Bay / City,,0,1,Tub,,0,2,4,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,Pro viejas. recien pintado,6b274e4f,03929529,68378b263fbb6747fc9addb9,
f05affe4,0905-01,9,Line 05.01,Partial Bay / City,,0,1,Tub,,0,3,2,1,0,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,1121516d,,
6759b813,1706-02,17,Line 06.02,Bay / Pool,,0,1,,,0,2,4,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,Van a vender esta unidad. no vale la pena,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
85d921c4,0904-02,9,Line 04.02,Bay / Pool,,0,1,Tub,,0,2,4,1,0,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,682bd54d,68378b2d70c94cf2ee08bc08,
251046c6,1218,12,Line 18,Bay,,2,2.5,Tub,,0,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,5210eca4,68378b4b70c94cf2ee08c09a,
1fff54c5,1706-01,17,Line 06.01,Partial Bay / Pool,,0,1,Tub,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
496a619d,1608/09,16,Line 09,Partial Bay / City,,0,1,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,0eda0428,68378b2570c94cf2ee08bb80,
dddeb32c,2017,20,Line 17,City / Partial Bay,,2,2.5,Tub,,0,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
c0282217,1516,15,Line 16,Bay / Pool,,0,1,Tub,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,1121516d,68378b2370c94cf2ee08bb33,
ba8bf80c,1406-01,14,Line 06.01,Partial Bay / Pool,,0,1,Both,,0,6,2,3,1,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
1ad1ab35,1518-02,15,Line 18.02,Bay,,1,1.5,Both,,0,8,4,5,1,1,2,Yes,Yes,Pro,TRUE,10,,6b274e4f,78b43fa7,68378b2570c94cf2ee08bb5e,
1131ba94,1606-02,16,Line 06.02,Bay / Pool,,0,1,Both,,,6,4,4,1,0,2,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
b9e623ea,2018-02,20,Line 18.02,Bay,,1,1.5,Both,,0,6,4,3,1,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,7a768d63,68378b2d3fbb6747fc9adeb2,
aab5193e,1801-01,18,Line 01.01,Partial Bay / City,,0,1,Both,,0,6,2,4,1,0,2,Yes,Yes,Pro,TRUE,10,,6b274e4f,e448667e,6924c667c764b2469865b79b,
13b14d1f,1509,15,Line 09,Partial Bay / City,,0,1,Both,,0,6,4,3,1,1,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,,,
2e96f1b8,1801,18,Line 01,Bay,,2,2.5,Shower,,0,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,e448667e,6924c667c764b2469865b79b,
8451deff,0901-01,9,Line 01.01,Partial Bay / City,,0,1,,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
f8c8f623,1410-02,14,Line 10.02,City / Partial Bay,,0,1,,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,4daabc2b,68378b233fbb6747fc9add57,
046a287c,2001,20,Line 01,Bay,,2,2.5,Tub,330,30.7,2,6,1,1,0,0,No,Yes,Pro,TRUE,10,Kitchenette,6b274e4f,a9f5ba3d,68378b2b70c94cf2ee08bbe1,
e9cf3163,1717-02,17,Line 17.02,City / Partial Bay,,1,1.5,Tub,,0,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,a9f5ba3d,68378b2b70c94cf2ee08bbe1,
fd97a0e4,1501-01,15,Line 01.01,Partial Bay / City,,0,1,Shower,,0,8,2,5,1,1,2,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
6afbd237,1808-02,18,Line 08.02,Partial Bay / City,,0,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,c51d485a,68378b1f70c94cf2ee08bad2,
de179633,2017-01,20,Line 17.01,City,,0,1,Shower,,0,4,2,2,1,0,0,Yes,Yes,Pro,TRUE,10,,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
86eba5f0,1004-02,10,Line 04.02,Bay / Pool,,0,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,68378b1e70c94cf2ee08bab4,68378b1e70c94cf2ee08bab4,
208c4911,2017-02,20,Line 17.02,City / Partial Bay,,1,1.5,Shower,,0,4,4,2,1,0,0,Yes,Yes,Pro We Host,TRUE,10,,6b274e4f,9ecfcdfe,68378b2c3fbb6747fc9ade85,
13719742,1609,16,Line 09,Partial Bay / City,,0,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,,,
b8e23364,0904-02,9,Line 04.02,Bay / Pool,,0,1,Shower,,0,4,4,2,1,0,0,Yes,Yes,Pro We Host,TRUE,10,,6b274e4f,682bd54d,68378b2d70c94cf2ee08bc08,
60ff8510,1501-02,15,Line 01.02,Bay,,1,1,Shower,,0,8,4,5,1,1,2,Yes,Yes,Preliminary,TRUE,10,,6b274e4f,6f492a0a,68378b203fbb6747fc9add0f,
28b4a372,3304,33,Line 04,City & Bay,,0,1,Shower,1098,102,8,3,4,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,6e7d725d,687e340a7c443691a601ecd4,6806b2f1d541a60014bcf1b5
c39bc1ff,4409,44,Line 09,Oceanfront,,2,2,Shower,256,23.8,2,6,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,894a64a8,68498f7f874250501739e994,6806b264e32fe10013dcef23
a9eb4b80,2013,20,Line 13,City & Bay,,0,1.5,Shower,842,78.2,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,092ed988,68acb1439d9a39101a9a95e1,688800adbe6c360013372526
49caf0d3,3207,32,Line 07,City & Bay,,0,2,Shower,1315,122.2,6,3,3,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,4f7cec85,,6806b2fe87cfcb0013e1bd38
a4e80c13,1611,16,Line 11,Oceanfront,,2,2,Shower,255,23.7,2,6,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,f77da954,68d014c3bf01bf6767059bc6,68b764d331a72a0011f12e7e
4999b60d,4608,46,Line 08,City & Bay,,0,1,Bathtub,300,27.9,2,3,1,1,0,0,No,No,Preliminary,TRUE,10,,3b08b87b,de76cdfa,68a87c859d9a39101a821f05,6806b2df8a1b45001015a601
14ebe083,1411,14,Line 11,Oceanfront,,2,1.5,Shower,943,87.6,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,esto es una prueba,3b08b87b,f49e2303,684d99033fbb6747fc17a4c1,684b00348b07ff0011df9000
14159b27,2408,24,Line 08,City & Bay,,0,1,Tub,309,28.7,2,3,1,1,0,0,Kitchennette,Yes,Pro,TRUE,10,,3b08b87b,48332688,68f65a8b98d5e0bc209f8fbb,68b882448e539b001a00545f
61e9e35b,2418,24,Line 18,City & Bay,,3,3,Tub,430,39.9,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,cd3d4b76,683e3e293fbb6747fcbdf9d7,6806b323c20fd00011d76359
9fdd6af2,3018,30,Line 18,City & Bay,,3,2,Bathtub,963,89.5,6,8,3,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,75c42d3b,68378b3b70c94cf2ee08bdaa,6806b2ea4ed13700105f04cb
30149c32,1511,15,Line 11,Oceanfront,,2,2,Bathtub,240,22.3,2,6,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,e4a0ffac,,6806b328c1d93b0011c79c41
8cb87943,2916,29,Line 16,City & Bay,,0,1,shower,963,89.5,5,3,2,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,5f4a2dc7,68378b3b3fbb6747fc9ae105,6806b27dd541a60014bce6a5
1b2dafe5,2201,22,Line 01,City & Bay,,3,3,Shower,710,66,3,8,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,15a89b68,68378b313fbb6747fc9adf58,6806b26a1c0052001397ddb8
c9951234,2002,20,Line 02,City & Bay,,0,1,Tub,754,70,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,b7dae8d5,68378b3070c94cf2ee08bc64,6806b29f79ba1100138ca54a
2db78f6f,4207,42,Line 07,City & Bay,,0,1,Bathtub,390,36.2,2,3,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,87558ecd,68378b3a3fbb6747fc9ae0ab,6806b2964511e5001302b14d
f65053fa,3518,35,Line 18,City & Bay,,3,1,Bathtub,826,76.7,2,8,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,75c42d3b,,
d3ff10a7,2804,28,Line 04,City & Bay,,0,1,Shower/Bathtub,963,89.5,4,3,2,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,b82d9f00,68378b393fbb6747fc9ae08a,6806b31fc20fd00011d761db
5809fb7c,3201,32,Line 01,City & Bay,,3,3,Shower,710,66,2,8,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,bdc7dbdf,68acb44e9d9a39101a9ab888,689375612e3de8000f03e908
79ed0dd3,3503,35,Line 03,City & Bay,,0,1,Shower,256,23.8,2,3,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,43c1541e,,
81eae454,2513,25,Line 13,City & Bay,,0,1,Tub,309,28.7,2,3,1,1,0,0,Kitchenette,Yes,Pro,TRUE,10,,3b08b87b,6fc57a92,68378b363fbb6747fc9ae02b,6806b2b84ed13700105eff49
3eee76a5,4506,45,Line 06,City & Bay,,0,1,Tub,430,39.9,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,f0e75a2b,,6806b1e6c1d93b0011c779fe
456d405d,2709,27,Line 09,Oceanfront,,2,2,,390,36.2,2,6,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,4e70d730,,6806b2341945f6000fdb9260
27436f54,3416,34,Line 16,City & Bay,,0,1,Shower,401,37.3,6,3,4,1,0,2,Kitchennette,Yes,Pro,TRUE,10,,3b08b87b,f6077b0e,6849ad083fbb6747fc01731b,682f570bb4dc4800139c071c
f0a1cb6c,3617,36,Line 17,City & Bay,,2,3,Bathtub,710,66,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,c10e35ec,68378b3f70c94cf2ee08be5b,6806b2d9c1d93b0011c795ce
c3ec6c2a,4004,40,Line 04,No view,,0,1,Shower,350,32.5,2,2,1,1,0,0,No,No,Preliminary,TRUE,10,,3b08b87b,6216c6df,68378b3a70c94cf2ee08bd7c,6806b21a1c0052001397d51f
b6dd80b1,4107,41,Line 07,City & Bay,,0,1,Shower,390,36.2,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,46230c04,683e44db70c94cf2ee2cf82b,6806b216bdf6c0001203b7da
6c765fa4,2203,22,Line 03,City & Bay,,0,1,,754,70,4,3,2,1,0,0,Yes,Yes,Low Quality,TRUE,10,,3b08b87b,5fc05a7c,68378b3270c94cf2ee08bc83,6806b2aa0799d400120bf2a6
7cef9364,2604,26,Line 04,City & Bay,,2,3,Bathtub,747,69.4,8,3,5,2,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,81434379,68378b3770c94cf2ee08bd21,
36556e7c,2204,22,Line 04,City & Bay,,0,1,Tub,1098,102,6,3,3,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,4ce7d4f2,68378b3270c94cf2ee08bc9f,
4db7af4c,1511,15,Line 11,Oceanfront,,2,2,Tub,256,23.8,2,6,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,e4a0ffac,683e399370c94cf2ee2c889b,6806b328c1d93b0011c79c41
d68fbee5,3112,31,Line 12,City & Bay,,0,1.5,Tub,842,78.2,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,63f33593,68378b3c3fbb6747fc9ae123,6806b3a2ca95d400117b2388
e2f0c6e2,2306,23,Line 06,City & Bay,,0,1,Shower,398,37,4,3,2,1,0,0,Kitchennette,Yes,Pro,TRUE,10,,3b08b87b,a0447b18,685438d56296bf1efe3891a0,682f570bb4dc4800139c07a6
72705518,4416,44,Line 16,City & Bay,,0,1,Shower,330,30.7,2,3,1,1,0,0,No,Yes,Preliminary,TRUE,10,,3b08b87b,b3c62e3c,68d45fe530ff0be86438cf66,68a4c5923b226b001269786b
e084ef6a,2801,28,Line 01,City & Bay,,3,3,Shower,390,36.2,2,8,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,2ad5f3a9,68378b383fbb6747fc9ae06c,6806b2996a369700119cea58
1d1412e7,3318,33,Line 18,No view,,3,3,Bathtub,350,32.5,2,2,1,1,0,0,No,No,Preliminary,TRUE,10,,3b08b87b,7994bd26,689f9737f79bc95c1d6d2484,6887b4cd514240001335d39d
530313c9,2605,26,Line 05,City & Bay,,0,1,Bathtub,390,36.2,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,1c218adc,68378b3770c94cf2ee08bd3d,6806b2837cf9460012c127e7
c8214b45,2213,22,Line 13,City & Bay,,0,1,Bathtub,365,33.9,2,3,1,1,0,0,Kitchennette,Yes,Pro,TRUE,10,,3b08b87b,5cf445c4,6878ef3d7c443691a6e1348c,684b140990b4f1001389dbb0
6c177ed8,1915,19,Line 15,City & Bay,,1,1,Bathtub,963,89.5,6,4,3,2,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,,,
d81c8642,2514,25,Line 14,City & Bay,,1,2,Tub/Shower,1098,102,6,4,3,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,90203f23,68378b353fbb6747fc9ae00e,6806b2bf43a2e700139e2c9b
56748044,3517,35,Line 17,City & Bay,,2,3,Tub,309,28.7,2,6,1,1,0,0,Kitchenette,Yes,Pro,TRUE,10,,3b08b87b,4e70d730,,6806b24eb567cd0013b6ee7e
4ed358ef,3818,38,Line 18,City,,3,3,Bathtub,370,34.4,2,8,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,d5d75b1d,68378b3f3fbb6747fc9ae175,6806b2cdca95d400117b11ed
cda8b534,3509,35,Line 09,Oceanfront,,2,2,Tub/Shower,1098,102,6,6,3,2,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,493b3ee6,68378b3e70c94cf2ee08be3b,6806b2d222e8a400131de52d
b2807acb,2701,27,Line 01,City & Bay,,3,1,Tub,842,78.2,4,8,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,58a69198,68c7a0cfc55c40c695a1b4d1,6890de156212190011bb9735
3234afe5,2701,27,Line 01,City & Bay,,3,3,Bathtub,390,36.2,2,8,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,58a69198,68c7a0cfc55c40c695a1b4d1,6806b2e9b567cd0013b6fbaa
fcda788d,4016,40,Line 16,City & Bay,,0,1,Shower,256,23.8,2,3,1,1,0,0,No,No,Preliminary,TRUE,10,,3b08b87b,569d13c0,,6806b300d541a60014bcf358
5f0a0def,1609,16,Line 09,Oceanfront,,2,2,Shower,309,28.7,2,6,1,1,0,0,No,Yes,Preliminary,TRUE,10,,3b08b87b,a93a595c,683e467c70c94cf2ee2d02d1,682f4321f01463001237005f
1470a81a,3306,33,Line 06,City & Bay,,0,1,Shower,430,39.9,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,f822591f,68669c0ab0c414792af75c01,6852f565e041780020e06358
1fba362b,3313,33,Line 13,City & Bay,,0,1,Bathtub,330,30.7,4,3,3,1,0,2,No,Yes,Preliminary,TRUE,10,,3b08b87b,6c2bb00a,68378b3570c94cf2ee08bce4,6806b2735aa7e90013287886
a2d0430d,4109,41,Line 09,Oceanfront,,2,2,Shower,1429,132.8,8,6,5,1,1,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,7fa0d235,68378b403fbb6747fc9ae191,6806b20ac1d93b0011c77f51
de3b4740,2602,26,Line 02,City & Bay,,0,1,Shower,549,51,8,3,4,1,2,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,cf9777ff,68504d386296bf1efe1d75f1,684b1028df947600123892ea
ad25cd52,2414,24,Line 14,City & Bay,,1,2,Shower,851,79.1,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,290d17a5,685439af75bdda128920c52c,682f569f838ce500110b87f2
c88dfd64,4610,46,Line 10,Oceanfront,,1,1,Shower,688,63.9,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,147501e4,68378b4370c94cf2ee08befb,6806b27887cfcb0013e1b2f3
b9ad26b3,3112,31,Line 12,City & Bay,,0,1,Shower,472,43.9,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,63f33593,68378b3c3fbb6747fc9ae123,6806b3a2ca95d400117b2388
21f78c93,4407,44,Line 07,City & Bay,,0,1,Shower,535,49.7,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,fb310324,68378b4270c94cf2ee08beda,6806b283e32fe10013dcf471
b484f12b,3505,35,Line 05,City & Bay,,0,1,Shower,532,49.4,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,6e19e077,68378b3d70c94cf2ee08be1f,6806b28b79ba1100138c9e81
cd2eb9fb,1804,18,Line 04,City & Bay,,0,1,Shower,535,49.7,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,2a77b4cb,,6887ec1ee906060012735702
48a02e3b,4316,43,Line 16,City & Bay,,0,1,Shower,455,42.3,4,3,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,14643d50,687e34fdf94252e6401b69d6,6876c287eaa253002a13b596
fd0bb3cb,2215,22,Line 15,City & Bay,,1,1,Shower,703,65.3,8,4,5,1,1,2,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,5bce7768,68378b323fbb6747fc9adf92,6806b2897bd7ef001101df33
37db324f,4307,43,Line 07,City & Bay,,0,1,Shower,535,49.7,4,3,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,aa102b8e,68503e9c6296bf1efe1d152d,684af1bf35d0930011a03b87
c43e6edc,4313,43,Line 13,City & Bay,,0,1,Shower,459,42.6,6,3,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,d0d86e75,68378b423fbb6747fc9ae1e7,
05e75c17,1911,19,Line 11,Oceanfront,,2,2,Shower,1202,111.7,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,2f1270b1,683e48d370c94cf2ee2d0d33,
5a878ab5,4408,44,Line 08,City & Bay,,0,1,Shower,524,48.7,4,3,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,e193644c,683e447b70c94cf2ee2cf52c,
471328ac,4210,42,Line 10,Oceanfront,,1,1,Shower,688,63.9,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,657a4b3f,68378b413fbb6747fc9ae1ad,
0b2c0286,3316,33,Line 16,City & Bay,,0,1,Shower,455,42.3,8,3,4,1,1,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,63f33593,68378b3c3fbb6747fc9ae123,
3c2a919a,2913,29,Line 13,City & Bay,,0,1,Shower,459,42.6,6,3,3,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,40fb63a9,68378b3b3fbb6747fc9ae0e7,
0d1c3122,1609,16,Line 09,Oceanfront,,2,2,Shower,1429,132.8,4,6,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,a93a595c,683e467c70c94cf2ee2d02d1,682f4321f01463001237005f
6205d4b1,2508,25,Line 08,City & Bay,,0,1,Shower,524,48.7,6,3,3,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,48332688,68f65a8b98d5e0bc209f8fbb,
f5cae30b,2803,28,Line 03,City & Bay,,0,1,Shower,531,49.3,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,80815c78,68378b3970c94cf2ee08bd5c,
ec1b0721,2910,29,Line 10,Oceanfront,,1,1,Shower,688,63.9,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,98683aa0,683e37ea70c94cf2ee2c809b,
04398826,3013,30,Line 13,City & Bay,,0,1,Both,459,42.6,5,3,4,1,0,3,Yes,Yes,Pro,TRUE,10,,3b08b87b,67159cb1,687e349e7c443691a601f5fd,
17c92000,1717,17,Line 17,City & Bay,,2,3,Tub,1254,116.5,3,6,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,752b9e17,685970ae5dba7ebb1d5034b4,6852cd7e9594ce0013e46a52
668abae6,2418,24,Line 18,City & Bay,,3,3,Both,1533,142.4,4,8,2,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,cd3d4b76,683e3e293fbb6747fcbdf9d7,
1859548b,3615,36,Line 15,City & Bay,,1,1,Both,703,65.3,6,4,4,1,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,405c5b67,68378b3e3fbb6747fc9ae154,
99bcad06,1916,19,Line 16,City & Bay,,0,1,Tub,455,42.3,4,3,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,1c49b438,68378b3070c94cf2ee08bc48,
641defe8,2218,22,Line 18,City & Bay,,3,3,Tub,1533,142.4,4,8,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,0bc5405b,68378b3370c94cf2ee08bcbe,
9d413516,2817,28,Line 17,City & Bay,,2,3,Tub,1254,116.5,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,e2c597cd,68378b3a3fbb6747fc9ae0cb,
27e40aae,2619,26,Line 19,City,,1,1,Both,769,71.4,4,4,2,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,46bd1d26,68476eea87425050172c87ea,
734185e1,4302,43,Line 02,City & Bay,,0,1,Both,549,51,6,3,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,5dac35f9,68378b423fbb6747fc9ae1cb,
f95fc2d3,2208,22,Line 08,City & Bay,,0,1,Both,524,48.7,4,3,3,1,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,d6679247,688bf8d1d26844a72317718d,
16b7d1c2,2416,24,Line 16,City & Bay,,0,1,Both,455,42.3,6,3,3,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,0e2e97d8,,
d190db34,4111,41,Line 11,Oceanfront,,2,2,Both,1202,111.7,6,6,4,1,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,95722793,68378b4070c94cf2ee08be98,
02695e49,3316,33,Line 16,City & Bay,,0,1,,455,42.3,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,63f33593,68378b3c3fbb6747fc9ae123,
4f97e35f,2404,24,Line 04,City & Bay,,0,1,,535,49.7,2,3,1,0,1,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,6c2bb00a,68378b3570c94cf2ee08bce4,
ab6fcba5,2402,24,Line 02,City & Bay,,0,1,Tub,549,51,2,3,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,be259724,,
115250e4,2619,26,Line 19,City,,1,1,Tub,769,71.4,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,46bd1d26,68476eea87425050172c87ea,
07a8945f,4115,41,Line 15,City & Bay,,1,1,Tub,703,65.3,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,c9860b38,68378b4170c94cf2ee08beb6,
03962729,1415,14,Line 15,City & Bay,,1,1,,703,65.3,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,e1a726bd,68378b2e3fbb6747fc9adefd,
b84e0ade,1514,15,Line 14,City & Bay,,1,2,,851,79.1,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,208e2dd6,68378b2f3fbb6747fc9adf1d,
3e4c1842,1911,19,Line 11,Oceanfront,,2,2,Tub,1202,111.7,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,2f1270b1,683e48d370c94cf2ee2d0d33,
9b6d5437,2810,28,Line 10,Oceanfront,,1,1,Tub,688,63.9,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,87558ecd,68378b3a3fbb6747fc9ae0ab,
cb313fcd,2804,28,Line 04,City & Bay,,0,1,Tub,535,49.7,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,b82d9f00,68378b393fbb6747fc9ae08a,
00212a54,4408,44,Line 08,City & Bay,,0,1,Both,524,48.7,6,3,4,1,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,e193644c,683e447b70c94cf2ee2cf52c,
76f7d97e,3113,31,Line 13,City & Bay,,0,1,Both,459,42.6,4,3,2,1,1,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,cbda5f9b,68378b3c70c94cf2ee08bdc8,
29b164f9,2809,28,Line 09,Oceanfront,,2,2,Tub,1429,132.8,6,6,4,1,0,2,Yes,Yes,Pro,TRUE,10,,3b08b87b,6216c6df,68378b3a70c94cf2ee08bd7c,
06109ca5,3108,31,Line 08,City & Bay,,0,1,Both,524,48.7,6,3,3,1,1,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,0e10c77f,686ef32d6369744fe2bc7378,68530a89d0489800179cd029
21338d02,2314,23,Line 14,City & Bay,,1,2,Both,851,79.1,4,4,3,1,0,2,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,5ad99faa,68378b333fbb6747fc9adfb0,
3edc9dc0,1814,18,Line 14,City & Bay,,1,2,Shower,851,79.1,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,42340ead,68378b2f3fbb6747fc9adf39,
7c490509,3605,36,Line 05,City & Bay,,0,1,,532,49.4,2,3,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,3b08b87b,1ca105e5,686ffd6bed89e4963b48404c,
bca1d8f8,2505,25,Line 05,City & Bay,,0,1,Bathtub,963,89.5,2,3,1,1,0,0,No,No,Pro,TRUE,10,,3b08b87b,90203f23,68378b353fbb6747fc9ae00e,
ee5b813d,2517,25,Line 17,City & Bay,,2,3,Bathtub,240,22.3,4,6,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,40449eed,68378b3670c94cf2ee08bd05,
e06c1a7e,2202,22,Line 02,City & Bay,,0,1,Tub,390,36.2,2,3,1,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,25852156,68378b313fbb6747fc9adf74,699dc7838a77370023312c7f
cac8e8e9,2808,28,Line 08,City & Bay,,0,1,Shower,524,48.7,4,3,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,e670a4b3,689f9656f79bc95c1d6d1aba,
78a96a29,4519,45,Line 19,City,,1,1,Shower,769,71.4,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,3b08b87b,4d57e003,68378b433fbb6747fc9ae20b,
39e0752e,4407,44,Line 07,City & River,,0,1,Tub,309,28.7,2,2,1,1,0,0,No,Yes,Preliminary,TRUE,10,,f9d8eb15,ec0ad880,68378b513fbb6747fc9ae40e,6806b08a1c0052001397ae2f
f21baea9,4405,44,Line 05,City & River,,0,1,Tub,430,39.9,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,ef9ca5c0,6876d04bf94252e640eb780f,699de8da3fed1000353400aa
bb338b75,3205,32,Line 05,City & River,,0,1,Shower,330,30.7,2,2,1,1,0,0,No,Yes,Pro,TRUE,10,,f9d8eb15,e4565cf4,68378b4970c94cf2ee08c00b,6806b09bca95d400117adc41
16bc367c,3403,34,Line 03,"City, river & Partial Bay",,1,1,Shower,790,73.4,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,5210eca4,68378b4b70c94cf2ee08c09a,6806b0f76a369700119cbaec
cf4da7fb,3301,33,Line 01,Oceanfront,,1,1,,330,30.7,2,2,1,1,0,0,,yes,Pro,TRUE,10,,f9d8eb15,5210eca4,68378b4b70c94cf2ee08c09a,6806b1c9fb295d000fc1927b
23d3e831,3505,35,Line 05,City & River,,0,1,,495,46,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,c7119ce2,68378b4c3fbb6747fc9ae33e,6806b0b82a77c7000fb60de6
9882cada,4207,42,Line 07,City & River,,1,1,,330,30.7,2,2,1,1,0,0,No,Yes,Preliminary,TRUE,10,,f9d8eb15,217f9b0f,68378b4f3fbb6747fc9ae39b,6806b31db567cd0013b700aa
8e78f847,4206,42,Line 06,City & River,,3,3,,842,78.2,8,2,4,1,2,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,ef9ca5c0,686eb11ced89e4963b3cdf51,6806b17b5aa7e90013285ee4
79101542,4307,43,Line 07,City & River,,1,1,,842,78.2,8,2,5,1,1,2,Yes,Yes,Pro,TRUE,10,,f9d8eb15,1121516d,686eb3a96369744fe2b9ff5e,6806b0900799d400120bbca8
54655edc,4801,48,Line 01,Oceanfront,,1,1,,898,83.4,4,2,2,1,0,0,,,No Photos,TRUE,10,,f9d8eb15,4cdddb6b,68378b5370c94cf2ee08c16e,6806b11bca95d400117ae5dd
e5694743,4608,46,Line 08,Oceanfront,,2,2,,1459,135.5,4,4,2,1,0,0,,,Pro,TRUE,10,,f9d8eb15,b97b4c55,683e3eb270c94cf2ee2cbea8,6806b1c07bd7ef001101c757
f8286aa1,1808,18,Line 08,Oceanfront,,2,2,Shower,1459,135.5,8,4,4,1,1,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,410659bb,683e395670c94cf2ee2c879a,6806b148627f4b0012537fdb
63f3e538,4606,46,Line 06,City & River,,1,1,,842,78.2,4,2,2,1,0,0,No,No,No Photos,TRUE,10,,f9d8eb15,ef9ca5c0,686eb11ced89e4963b3cdf51,6806b1f31945f6000fdb8cfe
1fda7507,4207,42,Line 07,City & River,,1,1,,842,78.2,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,217f9b0f,68378b4f3fbb6747fc9ae39b,6806b2964511e5001302b14d
c11b3720,4403,44,Line 03,"City, river & Partial Bay",,1,1,,790,73.4,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,a58401f9,68378b503fbb6747fc9ae3f2,6806b30bb567cd0013b6fe59
5cd2fc9e,4502,45,Line 02,Oceanfront,,2,2,,1386,128.8,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,78b43fa7,68378b2570c94cf2ee08bb5e,6806b11aca95d400117ae46d
25a79916,4809,48,Line 09,Oceanfront,,1,1,,953,88.5,4,2,2,1,0,0,,,No Photos,TRUE,10,,f9d8eb15,61ce8e87,68378b5370c94cf2ee08c18a,6806b1908a1b4500101586f8
1a12c5b3,1910,19,Line 10,Oceanfront,,2,2,,1347,125.1,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,de20b659,68378b443fbb6747fc9ae22d,6806b0f40d6ec90013d27525
8cf6cd5e,4202,42,Line 02,Oceanfront,,2,2,,1386,128.8,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,eeed016a,683e39ff3fbb6747fcbdccaa,6806b16522e8a400131dbcb3
e018cc3f,2001,20,Line 01,Oceanfront,,1,1,Shower/Bathtub,963,89.5,5,2,2,2,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,1926b08e,68378b4470c94cf2ee08bf38,6806b0bdc20fd00011d727f7
685a46e8,2002,20,Line 02,Oceanfront,,2,2,Shower,255,23.7,2,4,1,1,0,0,No,No,Preliminary,TRUE,10,,f9d8eb15,63909b8f,68378b4570c94cf2ee08bf5b,6806b1bd0799d400120bd6a6
50f2221a,2008,20,Line 08,Oceanfront,,2,2,Bathtub,710,66,3,4,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,07070c01,68378b453fbb6747fc9ae24b,6806b12d4ed13700105ed988
97bb9d04,3208,32,Line 08,Oceanfront,,2,2,,1459,135.5,2,4,1,1,0,0,No,No,Pro,TRUE,10,,f9d8eb15,,,6806b1c51945f6000fdb87ba
13c20a65,3703,37,Line 03,"City, river & Partial Bay",,1,1,,790,73.4,2,2,1,1,0,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,507ab43d,68378b4d70c94cf2ee08c0ee,6806b1cb79ba1100138c7be9
44f6a24f,4101,41,Line 01,Oceanfront,,1,1,,898,83.4,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,636a038c,68378b4e70c94cf2ee08c12c,6806b0f1c1d93b0011c75b66
8d00e268,3805,38,Line 05,City & River,,0,1,,495,46,4,2,2,0,2,0,Kitchenette,Yes,Preliminary,TRUE,10,,f9d8eb15,acde8e1b,68378b4d70c94cf2ee08c10a,6806b1dc0799d400120bdae2
525bca72,3211,32,Line 11,Oceanfront,,1,1,,876,81.4,2,2,1,1,0,0,No,No,Preliminary,TRUE,10,,f9d8eb15,ef9ca5c0,686eb11ced89e4963b3cdf51,6806b10c7908a50012c85b68
bd85b48f,3501,35,Line 01,Oceanfront,,1,1,,898,83.4,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,ad88f8ce,68378b4c70c94cf2ee08c0b6,6806b13f7bd7ef001101b5e9
94c4d8ec,3901,39,Line 01,Oceanfront,,1,1,,898,83.4,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,4daabc2b,68378b233fbb6747fc9add57,6806b101e32fe10013dcd1fb
0f5781e2,4107,41,Line 07,City & River,,1,1,,842,78.2,6,2,3,1,1,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,7dd1620c,68378b4770c94cf2ee08bfda,6806b13b627f4b0012537b69
d9d10d3d,4509,45,Line 09,Oceanfront,,1,1,,953,88.5,2,2,1,1,0,0,No,No,Pro,TRUE,10,,f9d8eb15,,,6806b1a9d541a60014bccd6f
a18098a4,4505,45,Line 05,City & River,,0,1,,495,46,4,2,2,1,0,0,yes,Yes,Pro,TRUE,10,,f9d8eb15,1121516d,68378b2370c94cf2ee08bb33,6806b105627f4b0012536cfb
127d3aa0,3401,34,Line 01,Oceanfront,,1,1,,898,83.4,2,2,1,1,0,0,No,Yes,Preliminary,TRUE,10,,f9d8eb15,85dfea67,,
ccef8e62,3705,37,Line 05,City & River,,0,1,,495,46,2,2,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,94c67fb8,683e3b8d3fbb6747fcbdd7da,6806b1bf5aa7e900132865bc
e49f8515,4102,41,Line 02,Oceanfront,,2,2,,1386,128.8,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,716db63d,68378b4e3fbb6747fc9ae37f,6806b0c24511e50013027ada
f916ac26,3307,33,Line 07,City & River,,1,1,,842,78.2,2,2,1,1,0,0,No,No,Pro,TRUE,10,,f9d8eb15,ef9ca5c0,686eb11ced89e4963b3cdf51,6806b21f5aa7e90013286db9
5a15b5ec,3710,37,Line 10,Oceanfront,,2,2,,1347,125.1,2,4,1,1,0,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,c51d485a,68378b1f70c94cf2ee08bad2,6806b10022e8a400131db3df
50b3e72d,4702,47,Line 02,Oceanfront,,2,2,,1386,128.8,4,4,2,1,0,0,,,No Photos,TRUE,10,,f9d8eb15,a4202ead,68378b4470c94cf2ee08bf17,6806b11fc1d93b0011c7606d
8df05a5b,4211,42,Line 11,Oceanfront,,1,1,,876,81.4,6,2,3,1,1,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,ed52c147,68378b4f3fbb6747fc9ae3b7,6806b258bdf6c0001203bd3e
bb38b366,4310,43,Line 10,Oceanfront,,2,2,,1347,125.1,4,4,2,1,0,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,832f7a39,68378b503fbb6747fc9ae3d6,6806b0a0d541a60014bcb407
b5d421c8,4607,46,Line 07,City & River,,1,1,,842,78.2,4,2,2,1,0,0,,,No Photos,TRUE,10,,f9d8eb15,13ed2095,68378b5270c94cf2ee08c152,6806b10f4511e50013028070
7eea4ad5,3308,33,Line 08,Oceanfront,,2,2,,1459,135.5,2,4,1,1,0,0,No,No,Preliminary,TRUE,10,,f9d8eb15,f23af722,,
0b6e30de,3308,33,Line 08,Oceanfront,,2,2,,1459,135.5,2,4,1,1,0,0,No,No,Preliminary,TRUE,10,,f9d8eb15,f23af722,,
c048375e,4408,44,Line 08,Oceanfront,,2,2,,1459,135.5,6,4,3,1,1,0,Yes,Yes,Pro,TRUE,10,,f9d8eb15,,,6806b3237908a50012c8902e
2e6f582b,3507,35,Line 07,City,,1,1,,842,78.2,2,4,1,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,5fd2f5d4,68378b4c70c94cf2ee08c0d2,6806b1ecc20fd00011d743a9
6dd03686,3906,39,Line 06,City & River,,1,1,,842,78.2,4,2,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,5133a003,68378b4e3fbb6747fc9ae35e,6806b0b00d6ec90013d270b4
164d6afa,4511,45,Line 11,Oceanfront,,1,1,,876,81.4,4,2,2,1,0,0,,,No Photos,TRUE,10,,f9d8eb15,8756c0bc,68378b523fbb6747fc9ae462,6806b16b322a39001368ef53
1913cc59,1608,16,Line 08,Oceanfront,,2,2,Shower,1459,135.5,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,a4202ead,,6806b1041945f6000fdb7575
8349203e,4210,42,Line 10,Oceanfront,,2,2,,1347,125.1,4,4,2,1,0,0,Yes,Yes,Preliminary,TRUE,10,,f9d8eb15,c51d485a,68378b1f70c94cf2ee08bad2,6806b2a24511e5001302b3e7
30877bbf,3708,37,Line 08,City/ Partial Bay,,1,1,,697,64.8,4,2,2,1,0,0,,,Pro,TRUE,10,,b6625228,d4f06586,68378b5570c94cf2ee08c1b2,68378b5570c94cf2ee08c1b2
21fb48fc,4612,46,Line 12,City/ Partial Bay,,0,1,,460,42.7,6,2,3,1,1,0,,,Pro,TRUE,10,,b6625228,6216c6df,68378b3a70c94cf2ee08bd7c,6806b2bb0d6ec90013d2a0b0`

// ─── Import ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('📦 Starting units upsert...\n')

  const allOwners = await db.owner.findMany({ select: { uniqueId: true } })
  const ownerSet  = new Set(allOwners.map((o) => o.uniqueId))
  console.log(`  Owners in DB : ${ownerSet.size}`)

  const lines   = CSV.trim().split('\n').filter(Boolean)
  const rawRows = lines.slice(1).map(parseCsvLine)
  console.log(`  Rows in CSV  : ${rawRows.length}\n`)

  // Resolve duplicate unit_number per building:
  // First occurrence keeps the original number; subsequent ones get b / c / d … appended.
  const seenNums = new Map<string, number>()
  const ALPHA    = 'bcdefghijklmnopqrstuvwxyz'

  const rows = rawRows.map((row) => {
    const number     = row[1]?.trim() ?? ''
    const buildingId = row[23]?.trim() ?? ''
    if (!number || !buildingId) return row
    const key  = `${buildingId}::${number}`
    const seen = seenNums.get(key) ?? 0
    seenNums.set(key, seen + 1)
    if (seen === 0) return row
    const suffix  = seen < ALPHA.length ? ALPHA[seen - 1] : `_${seen}`
    const newRow  = [...row]
    newRow[1]     = `${number}${suffix}`
    return newRow
  })

  let created = 0, updated = 0, failed = 0, noOwner = 0

  for (const row of rows) {
    const id            = row[0]?.trim()
    const number        = row[1]?.trim()
    const buildingId    = row[23]?.trim() ?? ''
    const ownerUniqueId = row[24]?.trim() ?? ''
    // row[25] = owner_id (Guesty external ref, not stored)
    // row[26] = listing_id (Guesty external ref, not stored)

    if (!id || !number || !buildingId) { failed++; continue }

    const br        = parseBedrooms(row[6] ?? '')
    const ownerLink = ownerUniqueId && ownerSet.has(ownerUniqueId) ? ownerUniqueId : null
    if (ownerUniqueId && !ownerLink) noOwner++

    const photoQuality = row[19]?.trim() || null
    const notesStr     = row[22]?.trim() ?? ''
    const sqftRaw      = toNum(row[9] ?? '')

    const data = {
      number,
      floor:         toInt(row[2]  ?? ''),
      line:          row[3]?.trim()  || null,
      view:          row[4]?.trim()  || null,
      type:          inferType(br),
      bedrooms:      br,
      bathrooms:     toNum(row[7]  ?? ''),
      bathType:      row[8]?.trim()  || null,
      sqft:          sqftRaw ? Math.round(sqftRaw) : null,
      mt2:           toNum(row[10] ?? ''),
      capacity:      toInt(row[11] ?? ''),
      amenityCap:    toInt(row[12] ?? ''),
      totalBeds:     toInt(row[13] ?? ''),
      kings:         safeInt(row[14] ?? ''),
      queens:        safeInt(row[15] ?? ''),
      twins:         safeInt(row[16] ?? ''),
      hasKitchen:    parseKitchen(row[17] ?? ''),
      hasBalcony:    parseBalcony(row[18] ?? ''),
      photoQuality,
      status:        inferStatus(notesStr, photoQuality ?? ''),
      score:         toNum(row[21] ?? ''),
      notes:         notesStr || null,
      buildingId,
      ownerUniqueId: ownerLink,
    }

    try {
      const existing = await db.unit.findUnique({ where: { id }, select: { id: true } })
      if (existing) {
        await db.unit.update({ where: { id }, data })
        updated++
      } else {
        await db.unit.create({ data: { id, ...data } })
        created++
      }
      if ((created + updated) % 50 === 0) {
        process.stdout.write(`  ... ${created + updated} processed\n`)
      }
    } catch (e) {
      console.error(`  ❌ ${number} (${id}) @ ${buildingId}: ${(e as Error).message}`)
      failed++
    }
  }

  const total = await db.unit.count()
  console.log('\n─────────────────────────────────')
  console.log(`✅ Created   : ${created}`)
  console.log(`🔄 Updated   : ${updated}`)
  console.log(`⚠️  No owner  : ${noOwner} (ownerUniqueId not found — run owners import first)`)
  console.log(`❌ Failed    : ${failed}`)
  console.log(`📊 Total DB  : ${total}`)
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => { console.error('\n❌ Import failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())
