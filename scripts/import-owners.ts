/**
 * scripts/import-owners.ts
 * Full replacement import of all owners from the AppSheet source CSV into Cloud SQL.
 *
 * What this script does:
 *  1. Saves current unit → ownerUniqueId mapping (to restore after delete)
 *  2. Nulls out all Unit.ownerUniqueId (required to satisfy FK before delete)
 *  3. Deletes all existing owners (hard delete — full replacement)
 *  4. Inserts all 172 owners from the CSV via createMany
 *  5. Restores Unit.ownerUniqueId from saved mapping (re-links units to owners)
 *
 * CSV columns (17, 0-indexed):
 *   0: owner_uniqueId   1: owner_nickname    2: owner_type (empty→individual)
 *   3: owner_personality  4: owner_document (documentNumber)
 *   5: owner_phone       6: owner_address    7: owner_email
 *   8: owner_otheremail  9: owner_photo (photoUrl)  10: owner_linkedin
 *  11: owner_age (Int)  12: owner_nationality  13: owner_language (empty→en)
 *  14: owner_siteuser   15: owner_notes       16: owner_status (TRUE→active, else active)
 *
 * Prerequisites:
 *  - Cloud SQL Auth Proxy running: cloud-sql-proxy miami-vr-data:us-east1:mvr-ops-hub-db
 *
 * Run:
 *   npx ts-node -P tsconfig.json scripts/import-owners.ts
 */

import { PrismaClient } from '@prisma/client'

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

function str(v: string): string | undefined {
  const s = v.trim()
  return s || undefined
}

function toInt(v: string): number | undefined {
  const n = parseInt(v.trim(), 10)
  return isNaN(n) ? undefined : n
}

// ─── Source CSV (17 columns) ──────────────────────────────────────────────────

const CSV = `owner_uniqueId,owner_nickname,owner_type,owner_personality,owner_document,owner_phone,owner_address,owner_email,owner_otheremail,owner_photo,owner_linkedin,owner_age,owner_nationality,owner_language,owner_siteuser,owner_notes,owner_status
4165f8ff,Alejandro Guerra,,,,,,,,,,,,,,,
ed52c147,Aleksandr Serebrov,,,,,,,,,,,,,,,
147501e4,Alexandre Isak Aroyo,,,,,,,,,,,,,,,
ef9ca5c0,Alexey Nazarov,,,,,,,,,,,,,,,
98683aa0,Alfonso Parra,,,,,,,,,,,,,,,
4cdddb6b,Ana Gloria Antolini,,,,,,,,,,,,,,,
01a5f240,Ana Inés Bonet,,,,,,,,,,,,,,,
14643d50,Ana Maria Andino,,,,,,,,,,,,,,,
40fb63a9,Ande Akinrele,,,,,,,,,,,,,,,
410659bb,Andrew Dean,,,,,,,,,,,,,,,
e4a0ffac,Angela Granada,,,,,,,,,,,,,,,
a0447b18,Angela Uribe,,,,,,,,,,,,,,,
507ab43d,Annamaria Gyimesi,,,,,,,,,,,,,,,
2e809f15,Armin Zadakbar,,,,,,,,,,,,,,,
be259724,Arthur Kostanian,,,,,,,,,,,,,,,
d9698bb5,Baldev Johal,,,,,,,,,,,,,,,
607df668,Barbra Saxon,,,,,,,,,,,,,,,
7f2dc689,Belquis Echagarrua,,,,,,,,,,,,,,,
aa102b8e,Ben Yuanqing Ni,,,,,,,,,,,,,,,
eeed016a,Benjamin Lowell Price,,,,,,,,,,,,,,,
092ed988,Betty A Palomino,,,,,,,,,,,,,,,
f4ef9339,Carla Lopez,,,,,,,,,,,,,,,
e670a4b3,Carlos Arrieta,,,,,,,,,,,,,,,
1c218adc,Carlos Dextre Porras,,,,,,,,,,,,,,,
f822591f,Carlos Leaño,,,,,,,,,,,,,,,
1c49b438,Carlos Romero Perez,,,,,,,,,,,,,,,
1926b08e,Carlos Ruben Vissani,,,,,,,,,,,,,,,
40449eed,Carlos Valbuena,,,,,,,,,,,,,,,
43c1541e,Cecilia de Valdano,,,,,,,,,,,,,,,TRUE
31329685,Cindy Coronado,,,,,,,,,,,,,,,
414a9b0e,Claudia Carrasquilla,,,,,,,,,,,,,,,
894a64a8,Curtis Gordon,,,,,,,,,,,,,,,
42340ead,Dan Steinberg,,,,,,,,,,,,,,,
4d57e003,Daniel Ambriz,,,,,,,,,,,,,,,
94c67fb8,Daniel Chevenon,,,,,,,,,,,,,,,
6edc0413,Daniel Pelaez,,,,,,,,,,,,,,,
493b3ee6,Daniela Vargas,,,,,,,,,,,,,,,
a129be89,Diana Bohorquez,,,,,,,,,,,,,,,
6fc57a92,Diego Mauricio Jimenez Tarazona,,,,,,,,,,,,,,,
acde8e1b,Dmitry Antonov,,,,,,,,,,,,,,,
6c2bb00a,Domingo Yi,,,,,,,,,,,,,,,
6c95265f,Douglas Marcos da Silva,,,,,,,,,,,,,,,
0eda0428,Elana Rosenzweig,,,,,,,,,,,,,,,
12d1fa12,Elizabeth Wolff,,,,,,,,,,,,,,,
5133a003,Enrique Barrera de Madariaga,,,,,,,,,,,,,,,
d0d86e75,Erkan Bolat,,,,,,,,,,,,,,,
a58401f9,Esteban chami,,,,,,,,,,,,,,,
63f33593,Federico Jaramillo,,,,,,,,,,,,,,,
d9a3a790,Felipe Bejarano,,,,,,,,,,,,,,,
1121516d,Fernando Samaniego,,,,,,,,,,,,,,,
13ed2095,Fethi Khiari,,,,,,,,,,,,,,,
6f492a0a,Florian Hagenbuch,,,,,,,,,,,,,,,
bdc7dbdf,Francine Ramires,,,,,,,,,,,,,,,
dcf621fe,Francisco Ballester,,,,,,,,,,,,,,,
72b0ceb5,Francisco Febres,,,,,,,,,,,,,,,
cd3d4b76,Francisco Pardo,,,,,,,,,,,,,,,
208e2dd6,Gary Hardyal,,,,,,,,,,,,,,,
87558ecd,Gaston Irigoin,,,,,,,,,,,,,,,
636a038c,Gerard Escudé,,,,,,,,,,,,,,,
58a69198,Gerardo Velez,,,,,,,,,,,,,,,
e8cb528f,Gilles Muoy,,,,,,,,,,,,,,,
0e2e97d8,Gloria Ralda,,,,,,,,,,,,,,,
b97b4c55,Grama Ravi,,,,,,,,,,,,,,,
e448667e,Gregory Hanley,,,,,,,,,,,,,,,
c7119ce2,Gustavo Cuiña,,,,,,,,,,,,,,,
ec0ad880,Gustavo Rodriguez,,,,,,,,,,,,,,,
cf9777ff,Gustavo Trujillo,,,,,,,,,,,,,,,
b4ad4cd3,Harout Darzyan,,,,,,,,,,,,,,,
d5d75b1d,Hector Augusto Lopez,,,,,,,,,,,,,,,
0c121ab6,Humberto Cubillos,,,,,,,,,,,,,,,
4daabc2b,Ibe Terika Mbanu,,,,,,,,,,,,,,,
4e70d730,Ivan Bilytskyi,,,,,,,,,,,,,,,
405c5b67,Ivan Rodriguez,,,,,,,,,,,,,,,
9ecfcdfe,Jack Sins,,,,,,,,,,,,,,,
6e52c8ed,Jacqueline Lievano,,,,,,,,,,,,,,,
78b43fa7,Jaime Eduardo Miguel,,,,,,,,,,,,,,,
03929529,James Cunningham,,,,,,,,,,,,,,,
63909b8f,Janet Catanese,,,,,,,,,,,,,,,
b82d9f00,Jean-Eric Naranien,,,,,,,,,,,,,,,
832f7a39,Jen Henderson,,,,,,,,,,,,,,,
90203f23,Jesus Enrique Gallardo Mantilla,,,,,,,,,,,,,,,
5fc05a7c,Jorge Boada,,,,,,,,,,,,,,,
25852156,Jorge Guzman,,,,,,,,,,,,,,,
de76cdfa,Jose Alejandro Guerrero Becerra,,,,,,,,,,,,,,,
217f9b0f,Jose Daniel Carrillo,,,,,,,,,,,,,,,
290d17a5,Juan Luis Trujillo,,,,,,,,,,,,,,,
2ad5f3a9,Juan Olivas,,,,,,,,,,,,,,,
72e6d451,Juliana Gama,,,,,,,,,,,,,,,
e4565cf4,Jyoti Sinha,,,,,,,,,,,,,,,
bc04ac49,Karinthia Rijo,,,,,,,,,,,,,,,
0bc5405b,Kathrin Rein,,,,,,,,,,,,,,,
7a768d63,Kevin Kelley,,,,,,,,,,,,,,,
6e7d725d,Laura Vecino,,,,,,,,,,,,,,,
b3c62e3c,Lilian Zwanzger,,,,,,,,,,,,,,,
5789b951,Liliana Levay,,,,,,,,,,,,,,,
07070c01,Ljiljana Stankovic,,,,,,,,,,,,,,,
6e19e077,Loreto Muñoz,,,,,,,,,,,,,,,
7dd1620c,Luca Antonietti,,,,,,,,,,,,,,,
e1a726bd,Luis Alejandro Santi,,,,,,,,,,,,,,,
7ec19a5d,Luis Cela,,,,,,,,,,,,,,,
c9860b38,Luis Duran,,,,,,,,,,,,,,,
cbda5f9b,Luis Fernando Muñoz Ocampo,,,,,,,,,,,,,,,
15a89b68,Manuel Medici,,,,,,,,,,,,,,,
5cf445c4,Manuela Jimenez,,,,,,,,,,,,,,,
5bce7768,Maria Beatriz Michell,,,,,,,,,,,,,,,
80815c78,María Paula Giraldo,,,,,,,,,,,,,,,
ad88f8ce,Maria Penciakova,,,,,,,,,,,,,,,
61ce8e87,Marianna Lanzman,,,,,,,,,,,,,,,
3c5d271b,Maricela Gabino Garcia,,,,,,,,,,,,,,,
7b2c8ac0,Mark Clark,,,,,,,,,,,,,,,
682bd54d,Mark Schweitzer,,,,,,,,,,,,,,,
2397c1c7,MIAR,,,,,,,,,,,,,,,
56ed1447,Michael Cheung,,,,,,,,,,,,,,,
c51d485a,Michael Commins,,,,,,,,,,,,,,,
42aa0683,Michael McLaughlin,,,,,,,,,,,,,,,
e193644c,Michelle Markosian Bueno,,,,,,,,,,,,,,,
81434379,Mina Mikhail,,,,,,,,,,,,,,,
46230c04,Mouhamad Dieng,,,,,,,,,,,,,,,
5dac35f9,Natacha B Avila,,,,,,,,,,,,,,,
0e10c77f,Natalia de Greiff,,,,,,,,,,,,,,,
569d13c0,Nicola Antonucci,,,,,,,,,,,,,,,
5fd2f5d4,Nish Shah,,,,,,,,,,,,,,,
657a4b3f,Noelia Joao,,,,,,,,,,,,,,,
b7dae8d5,Oleg Shnaider,,,,,,,,,,,,,,,
f6077b0e,Ophelia Pan,,,,,,,,,,,,,,,
f9930b4d,Oscar Loaiza Suarez,,,,,,,,,,,,,,,
75c42d3b,Pablo Mazzitelli,,,,,,,,,,,,,,,
36ee9f76,Patricia Azanza,,,,847 812 3771,,,,,,,,,,,
5f4a2dc7,Patricia del Rosario Sanchez,,,,,,,,,,,,,,,
67159cb1,Patricia Quezada,,,,,,,,,,,,,,,
cd9f6854,Patricia Vidal,,,,,,,,,,,,,,,
5210eca4,Rafael Peña,,,,,,,,,,,,,,,
f77da954,Rafael Romagnole,,,,,,,,,,,,,,,
5ad99faa,Ramón Hernández,,,,,,,,,,,,,,,
f49e2303,Rebeca de Vives,,,,,,,,,,,,,,,
95722793,Ricardo Arzayus,,,,,,,,,,,,,,,
716db63d,Richard A. De Los Santos,,,,,,,,,,,,,,,
a9f5ba3d,Richard Friedman,,,,,,,,,,,,,,,
57638251,Rishi Nandoe Tewarie,,,,,,,,,,,,,,,
e2c597cd,Rodrigo Agama,,,,,,,,,,,,,,,
3aea0f8d,Rodrigo Luna,,,,,,,,,,,,,,,
a93a595c,Rodrigo Tona,,,,,,,,,,,,,,,
48332688,Ronal Gaitan,,,,,,,,,,,,,,,
d1ed090d,Rosaida Lanuza,,,,,,,,,,,,,,,
7fa0d235,Rosario Manzano,,,,,,,,,,,,,,,
7994bd26,Ruben Leta,,,,,,,,,,,,,,,
f77c1557,Ruy Chaves,,,,,,,,,,,,,,,
de20b659,Salman Ahmad,,,,,,,,,,,,,,,
d6679247,Salvador Cardoso,,,,,,,,,,,,,,,
fb310324,Samia Fakih,,,,,,,,,,,,,,,
68251784,Santiago Lloreda,,,,,,,,,,,,,,,
96e0640a,Scott Gurka,,,,,,,,,,,,,,,
66eaab38,Sebastian Macias,,,,,,,,,,,,,,,
d6fa51e7,Shohreh Torabi,,,,,,,,,,,,,,,
6216c6df,Stephane Taala,,,,,,,,,,,,,,,
f0e75a2b,Steve Hardee,,,,+3405140751,,,,,,,,,,,
01efa4ff,Steve Herman,,,,,,,,,,,,,,,
d4f06586,Steve Tobkin,,,,,,,,,,,,,,,
9b601452,Suresh Bachu,,,,,,,,,,,,,,,
46bd1d26,Susana Vargas,,,,,,,,,,,,,,,
8756c0bc,Sushreeta Patel,,,,,,,,,,,,,,,
a4202ead,Tina Wind,,,,,,,,,,,,,,,
c10e35ec,Victoria Opatrny Vieira,,,,,,,,,,,,,,,
1ca105e5,Virginia Zuluaga,,,,,,,,,,,,,,,
4ce7d4f2,Viviana Hoyos,,,,,,,,,,,,,,,
f308c644,Voytek Borowski,,,,,,,,,,,,,,,
2f1270b1,Willian Elias Daher,,,,,,,,,,,,,,,
752b9e17,Ximena Najera,,,,,,,,,,,,,,,
e82c6692,Yelena Trushelev,,,,,,,,,,,,,,,
2a77b4cb,Maria Patricia Vidal,,,,,,,,,,,,,,,TRUE
4f7cec85,Paula Moreno,,,,,,,,,,,,,,,TRUE
85dfea67,Kyla Ralston,,,,,,,,,,,,,,,TRUE`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const lines = CSV.split('\n').slice(1).filter(l => l.trim())

  // Parse all rows
  const owners = lines.map(line => {
    const c = parseCsvLine(line)
    return {
      uniqueId:       c[0].trim(),
      nickname:       c[1].trim(),
      type:           (c[2].trim() === 'company' ? 'company' : 'individual') as 'individual' | 'company',
      personality:    str(c[3]),
      documentNumber: str(c[4]),
      phone:          str(c[5]),
      address:        str(c[6]),
      email:          str(c[7]),
      otherEmail:     str(c[8]),
      photoUrl:       str(c[9]),
      linkedin:       str(c[10]),
      age:            toInt(c[11]),
      nationality:    str(c[12]),
      language:       str(c[13]) ?? 'en',
      siteUser:       str(c[14]),
      notes:          str(c[15]),
      status:         'active' as const,  // all CSV owners are active
    }
  }).filter(o => o.uniqueId && o.nickname)

  console.log(`Parsed ${owners.length} owners from CSV`)

  // 1. Save current unit → ownerUniqueId mapping
  const unitLinks = await db.unit.findMany({
    select: { id: true, ownerUniqueId: true },
    where: { ownerUniqueId: { not: null } },
  })
  console.log(`Saved ${unitLinks.length} existing unit→owner links`)

  // 2. Null out ownerUniqueId on all units (satisfy FK before owner delete)
  await db.unit.updateMany({ data: { ownerUniqueId: null } })
  console.log('Cleared unit ownerUniqueId references')

  // 3. Delete all existing owners
  const deleted = await db.owner.deleteMany({})
  console.log(`Deleted ${deleted.count} existing owners`)

  // 4. Insert all owners
  const created = await db.owner.createMany({ data: owners })
  console.log(`Created ${created.count} owners`)

  // 5. Restore unit → owner links
  let restored = 0
  for (const u of unitLinks) {
    await db.unit.update({
      where: { id: u.id },
      data:  { ownerUniqueId: u.ownerUniqueId },
    })
    restored++
  }
  console.log(`Restored ${restored} unit→owner links`)

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
