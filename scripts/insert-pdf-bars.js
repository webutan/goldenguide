/**
 * Inserts bars from the PDF that aren't already in the database.
 * Uses the building groupings as the source of truth.
 */
import 'dotenv/config'
import pg from 'pg'
import { buildingGroups } from './pdf-groupings.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Street mapping from grouping keys to DB street values
const STREET_MAP = {
  'G1': 'G1',
  'G2': 'G2',
  'hanazono-1': 'hanazono-1',
  'hanazono-3': 'hanazono-3',
  'hanazono-8': 'hanazono-8',
  'maneki': 'maneki-dori',
  'landmark': 'landmark',
}

function normalize(s) {
  if (!s) return ''
  return s
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/[\s\-_・．.!！,、()（）&＆+＋'"''""\u200B]+/g, '')
}

function makeSlug(name, floor) {
  let slug = name
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3000-\u9fff\uff00-\uffef]+/g, '-')
    .replace(/^-|-$/g, '')
  if (!slug) slug = 'bar'
  return slug
}

async function main() {
  const { rows: dbBars } = await pool.query('SELECT id, name_jp, name_en, slug FROM bars ORDER BY id')
  const dbNorm = dbBars.map(b => ({ ...b, normJp: normalize(b.name_jp), normEn: normalize(b.name_en) }))

  function findMatch(name) {
    const norm = normalize(name)
    let found = dbNorm.find(db => db.normJp === norm)
    if (found) return found
    found = dbNorm.find(db => db.normEn && db.normEn === norm)
    if (found) return found
    found = dbNorm.find(db => db.normJp.length > 2 && (db.normJp.includes(norm) || norm.includes(db.normJp)))
    if (found) return found
    found = dbNorm.find(db => db.normEn && db.normEn.length > 2 && (db.normEn.includes(norm) || norm.includes(db.normEn)))
    if (found) return found
    return null
  }

  // Collect all bars from PDF that aren't in DB
  const toInsert = []
  const existingSlugs = new Set(dbBars.map(b => b.slug))

  for (const group of buildingGroups) {
    for (const pdfBar of group.bars) {
      if (findMatch(pdfBar.name)) continue // already in DB

      let slug = makeSlug(pdfBar.name, pdfBar.floor)
      // Deduplicate slug
      let finalSlug = slug
      let counter = 2
      while (existingSlugs.has(finalSlug)) {
        finalSlug = `${slug}-${counter}`
        counter++
      }
      existingSlugs.add(finalSlug)

      toInsert.push({
        slug: finalSlug,
        name_jp: pdfBar.name,
        street: STREET_MAP[group.street] || group.street,
        floor: pdfBar.floor,
      })
    }
  }

  console.log(`Found ${toInsert.length} bars to insert`)

  if (toInsert.length === 0) {
    await pool.end()
    return
  }

  // Skip the "？" bar (unknown)
  const filtered = toInsert.filter(b => b.name_jp !== '？')
  console.log(`Inserting ${filtered.length} bars (skipped unknown "？")`)

  let inserted = 0
  for (const bar of filtered) {
    try {
      await pool.query(
        `INSERT INTO bars (slug, name_jp, street, floor)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [bar.slug, bar.name_jp, bar.street, bar.floor]
      )
      inserted++
    } catch (err) {
      console.error(`Failed to insert ${bar.name_jp}:`, err.message)
    }
  }

  console.log(`Inserted ${inserted} new bars`)

  // Show totals
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) as count FROM bars WHERE is_active = true')
  console.log(`Total active bars: ${count}`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
