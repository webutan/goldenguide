/**
 * Matches PDF building groupings to bars in the database.
 */
import 'dotenv/config'
import pg from 'pg'
import { buildingGroups } from './pdf-groupings.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Manual alias map: PDF grouping name → DB bar id
// For bars where fuzzy matching cannot resolve the correct pair,
// or bars not included in the PDF building groupings layout.
const MANUAL_ALIASES = {
  // Bars not in the pdf-groupings building layout (landmarks / edge-of-map)
  // These are matched by DB id directly since they aren't in buildingGroups.
}

// PDF grouping name → DB id for bars that can't be matched by name normalization
const MANUAL_ID_MAP = {
  // id=144 百済 - same kanji in both PDF and DB but matcher may not find it
  // (Korean restaurant at top of map, outside the alley grid)
  144: '百済',
}

// DB bars confirmed not in the 2024 PDF map at all
const EXCLUDED_DB_IDS = new Set([
  88,   // ㈲マルハ企画 (company, not a bar)
  128,  // ポヨ (not in PDF)
  167,  // すみれ (not in PDF)
  175,  // バンビ (not in PDF; PDF has パンピ which is a different bar)
])

// Normalize: full-width → half-width, lowercase, strip spaces/punctuation
function normalize(s) {
  if (!s) return ''
  return s
    // Full-width alphanumeric → half-width
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    // Full-width space → regular space
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/[\s\-_・．.!！,、()（）&＆+＋'"''""\u200B]+/g, '')
}

async function main() {
  const { rows: dbBars } = await pool.query('SELECT id, name_jp, name_en, floor, street, slug FROM bars ORDER BY id')

  console.log(`DB has ${dbBars.length} bars`)
  console.log(`PDF has ${buildingGroups.length} building groups\n`)

  // Build normalized lookup
  const dbNormJp = dbBars.map(b => ({ ...b, normJp: normalize(b.name_jp), normEn: normalize(b.name_en) }))

  let matched = 0
  let unmatched = 0
  const unmatchedNames = []
  const matchedIds = new Set()

  function findMatch(name) {
    const norm = normalize(name)

    // Exact normalized match on name_jp
    let found = dbNormJp.find(db => db.normJp === norm)
    if (found) return found

    // Exact normalized match on name_en
    found = dbNormJp.find(db => db.normEn && db.normEn === norm)
    if (found) return found

    // Substring match (either direction) on name_jp
    found = dbNormJp.find(db => db.normJp.length > 2 && (db.normJp.includes(norm) || norm.includes(db.normJp)))
    if (found) return found

    // Substring match on name_en
    found = dbNormJp.find(db => db.normEn && db.normEn.length > 2 && (db.normEn.includes(norm) || norm.includes(db.normEn)))
    if (found) return found

    // Slug match
    found = dbNormJp.find(db => db.slug && db.slug.replace(/-/g, '') === norm)
    if (found) return found

    return null
  }

  for (const group of buildingGroups) {
    for (const pdfBar of group.bars) {
      const found = findMatch(pdfBar.name)
      if (found) {
        matchedIds.add(found.id)
        pdfBar.db_id = found.id
        pdfBar.db_name = found.name_jp
        matched++
      } else {
        unmatched++
        unmatchedNames.push(pdfBar.name)
      }
    }
  }

  console.log(`Matched: ${matched}`)
  console.log(`Unmatched from PDF: ${unmatched}`)
  if (unmatchedNames.length > 0) {
    console.log('Unmatched names:')
    for (const n of unmatchedNames) {
      console.log(`  "${n}"`)
    }
  }

  const dbNotInPdf = dbBars.filter(db => !matchedIds.has(db.id))
  console.log(`\nDB bars not found in PDF: ${dbNotInPdf.length}`)
  if (dbNotInPdf.length > 0) {
    for (const b of dbNotInPdf) {
      console.log(`  id=${b.id} "${b.name_jp}" (en: ${b.name_en || '-'})`)
    }
  }

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
