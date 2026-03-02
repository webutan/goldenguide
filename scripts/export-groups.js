/**
 * Exports building groups with resolved DB IDs to a JSON file
 * that the frontend can use for batch placement.
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import { buildingGroups } from './pdf-groupings.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

function normalize(s) {
  if (!s) return ''
  return s
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/[\s\-_・．.!！,、()（）&＆+＋'"''""\u200B]+/g, '')
}

async function main() {
  const { rows: dbBars } = await pool.query('SELECT id, name_jp, name_en, slug FROM bars WHERE is_active = true ORDER BY id')
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

  // Build groups with DB IDs
  const groups = []
  for (let i = 0; i < buildingGroups.length; i++) {
    const group = buildingGroups[i]
    const barIds = []
    for (const pdfBar of group.bars) {
      const match = findMatch(pdfBar.name)
      if (match) {
        barIds.push(match.id)
      }
    }
    if (barIds.length > 0) {
      groups.push({
        index: i,
        street: group.street,
        barIds,
        names: group.bars.map(b => b.name),
      })
    }
  }

  // Also build reverse map: bar_id → group_index
  const barToGroup = {}
  for (const g of groups) {
    for (const id of g.barIds) {
      barToGroup[id] = g.index
    }
  }

  const output = { groups, barToGroup }
  fs.writeFileSync('src/data/bar-groups.json', JSON.stringify(output, null, 2))
  console.log(`Exported ${groups.length} groups covering ${Object.keys(barToGroup).length} bars`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
