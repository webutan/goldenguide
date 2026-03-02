#!/usr/bin/env node
/**
 * Converts Plus Codes → lat/lng → map_x/map_y and updates the database.
 *
 * Usage: node scripts/geocode-plus-codes.js [--dry-run]
 */

import 'dotenv/config'
import pg from 'pg'
import { OpenLocationCode } from 'open-location-code'

const olc = new OpenLocationCode()

// GPS bounds of the SVG map (from topoexport metadata)
const SW = { lat: 35.693537, lng: 139.704115 }
const NE = { lat: 35.694574, lng: 139.705242 }

// SVG viewBox dimensions
const SVG_W = 3614.12
const SVG_H = 4096

// Reference point for recovering short Plus Codes (center of Golden Gai)
const REF_LAT = (SW.lat + NE.lat) / 2
const REF_LNG = (SW.lng + NE.lng) / 2

function gpsToSvg(lat, lng) {
  const x = ((lng - SW.lng) / (NE.lng - SW.lng)) * SVG_W
  const y = ((NE.lat - lat) / (NE.lat - SW.lat)) * SVG_H // y is inverted
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
}

function decodePlusCode(raw) {
  // Strip the locality suffix (e.g. " 新宿区、東京都")
  const code = raw.split(/\s/)[0].trim()
  if (!code) return null

  try {
    let fullCode
    if (olc.isValid(code) && olc.isFull(code)) {
      fullCode = code
    } else {
      fullCode = olc.recoverNearest(code, REF_LAT, REF_LNG)
    }
    const decoded = olc.decode(fullCode)
    return { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter }
  } catch (e) {
    console.error(`  Failed to decode "${raw}":`, e.message)
    return null
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const { rows } = await pool.query(
      `SELECT id, name_jp, plus_code FROM bars
       WHERE plus_code IS NOT NULL AND plus_code != ''
       ORDER BY id`
    )

    console.log(`Found ${rows.length} bars with Plus Codes`)
    if (dryRun) console.log('DRY RUN — no database changes\n')

    let updated = 0
    let skipped = 0
    let outOfBounds = 0

    for (const bar of rows) {
      const coords = decodePlusCode(bar.plus_code)
      if (!coords) {
        skipped++
        continue
      }

      const { x, y } = gpsToSvg(coords.lat, coords.lng)

      // Check if within map bounds (with some margin)
      const margin = 200
      if (x < -margin || x > SVG_W + margin || y < -margin || y > SVG_H + margin) {
        console.log(`  ⚠ ${bar.name_jp} (id=${bar.id}) out of bounds: (${x}, ${y}) — lat=${coords.lat}, lng=${coords.lng}`)
        outOfBounds++
        continue
      }

      if (dryRun) {
        console.log(`  ${bar.name_jp} (id=${bar.id}): ${bar.plus_code} → (${x}, ${y})`)
      } else {
        await pool.query(
          `UPDATE bars SET map_x = $1, map_y = $2, lat = $3, lng = $4, updated_at = now() WHERE id = $5`,
          [x, y, coords.lat, coords.lng, bar.id]
        )
      }
      updated++
    }

    console.log(`\nDone: ${updated} placed, ${skipped} failed, ${outOfBounds} out of bounds`)
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
