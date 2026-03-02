#!/usr/bin/env node
/**
 * Seeds the Postgres database from goldengai.csv
 *
 * Usage:
 *   npm run seed     # converts ODS→CSV if needed, then imports to DB
 *
 * Safe to run multiple times — uses upsert on slug.
 */

import { readFileSync, statSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

dotenv.config({ path: resolve(ROOT, '.env') })

const ODS_PATH = resolve(ROOT, 'updatedgoldengai.ods')
const CSV_PATH = resolve(ROOT, 'updatedgoldengai.csv')
const ODS_PATH_OLD = resolve(ROOT, 'goldengai.ods')
const CSV_PATH_OLD = resolve(ROOT, 'goldengai.csv')

const STREET_MAP = {
  '一番': 'hanazono-1',
  '三番': 'hanazono-3',
  '五番': 'hanazono-5',
  '八番': 'hanazono-8',
  'マ': 'maneki-dori',
  'ま': 'maneki-dori',
}

// --- CSV parsing (same as convert.js) ---
function parseCSV(text) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { current.push(field); field = '' }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field); field = ''
        if (current.some(f => f.trim())) rows.push(current)
        current = []
        if (ch === '\r') i++
      } else { field += ch }
    }
  }
  current.push(field)
  if (current.some(f => f.trim())) rows.push(current)
  return rows
}

function yesNo(val) {
  if (!val) return null
  const v = val.trim().toUpperCase()
  if (v === 'Y' || v === 'はい' || v === '○' || v === 'YES') return true
  if (v === 'N' || v === 'いいえ' || v === '×' || v === 'NO') return false
  return null
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  // Convert ODS → CSV if needed (prefer updated spreadsheet, fall back to original)
  let odsPath = existsSync(ODS_PATH) ? ODS_PATH : ODS_PATH_OLD
  let csvPath = existsSync(ODS_PATH) ? CSV_PATH : CSV_PATH_OLD

  if (existsSync(odsPath)) {
    const needsConvert = !existsSync(csvPath) ||
      statSync(odsPath).mtimeMs > statSync(csvPath).mtimeMs
    if (needsConvert) {
      console.log(`Converting ${odsPath} → CSV...`)
      execSync(`libreoffice --headless --convert-to csv "${odsPath}"`, { cwd: ROOT })
    }
  }

  if (!existsSync(csvPath)) {
    console.error('No CSV found.')
    process.exit(1)
  }

  console.log(`Using: ${csvPath}`)

  const raw = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(raw)
  const headers = rows[0]
  const data = rows.slice(1)

  const col = (name) => headers.indexOf(name)
  const iName = col('名前')
  const iStreet = col('番街')
  const iAddress = col('住所')
  const iPlusCode = col('Plus Code')
  const iFloor = col('階')
  const iCharge = col('チャージ')
  const iMaleCharge = col('男性')
  const iOtoshi = col('お通し付')
  const iSeats = col('席')
  const iPhone = col('電話')
  const iHours = col('営業時間')
  const iBottleKeep = col('ボトルキープ')
  const iClosedDays = col('定休日')
  const iSmoking = col('喫煙可能')
  const iEnglish = col('英語可能')
  const iMembers = col('メンバー')
  const iKaraoke = col('カラオケ')
  const iCashOnly = col('現金だけ')
  const iDrinkPrice = col('ドリンク')
  const iDescription = col('説明')
  const iSNS = col('SNS')

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  console.log(`Seeding ${data.length} bars into Postgres...`)

  const usedSlugs = new Set()
  let inserted = 0
  let updated = 0

  for (const row of data) {
    const name = (row[iName] || '').trim()
    if (!name) continue

    const streetRaw = (row[iStreet] || '').trim()
    const street = STREET_MAP[streetRaw] || streetRaw || null
    const floor = parseInt(row[iFloor]) || 1

    let slug = slugify(name) || `bar-${inserted}`
    if (!slug) slug = `bar-${inserted}`
    if (usedSlugs.has(slug)) slug = `${slug}-${floor}f`
    usedSlugs.add(slug)

    const seats = parseInt(row[iSeats]) || null

    const cashOnlyVal = yesNo(row[iCashOnly] || '')
    const drinkPrice = (row[iDrinkPrice] || '').trim() || null

    // Upsert bar
    const result = await pool.query(`
      INSERT INTO bars (slug, name_jp, street, floor, address, plus_code, charge, male_charge, drink_price, cash_only, seats, phone, hours, closed_days, description, sns)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (slug) DO UPDATE SET
        name_jp = EXCLUDED.name_jp,
        street = EXCLUDED.street,
        floor = EXCLUDED.floor,
        address = EXCLUDED.address,
        plus_code = EXCLUDED.plus_code,
        charge = EXCLUDED.charge,
        male_charge = EXCLUDED.male_charge,
        drink_price = EXCLUDED.drink_price,
        cash_only = EXCLUDED.cash_only,
        seats = EXCLUDED.seats,
        phone = EXCLUDED.phone,
        hours = EXCLUDED.hours,
        closed_days = EXCLUDED.closed_days,
        description = EXCLUDED.description,
        sns = EXCLUDED.sns,
        updated_at = now()
      RETURNING id, (xmax = 0) AS is_insert
    `, [
      slug, name, street, floor,
      (row[iAddress] || '').trim() || null,
      (row[iPlusCode] || '').trim() || null,
      (row[iCharge] || '').trim() || null,
      (row[iMaleCharge] || '').trim() || null,
      drinkPrice,
      cashOnlyVal,
      seats,
      (row[iPhone] || '').trim() || null,
      (row[iHours] || '').trim() || null,
      (row[iClosedDays] || '').trim() || null,
      (row[iDescription] || '').trim() || null,
      (row[iSNS] || '').trim() || null,
    ])

    const barId = result.rows[0].id
    if (result.rows[0].is_insert) inserted++
    else updated++

    // Generate and insert tags
    const tags = []
    const smoking = yesNo(row[iSmoking])
    if (smoking === true) tags.push('smoking')
    if (smoking === false) tags.push('no-smoking')
    const english = yesNo(row[iEnglish])
    if (english === true) tags.push('english-ok')
    if (english === false) tags.push('japanese-only')
    const members = yesNo(row[iMembers])
    if (members === true) tags.push('members-only')
    if (members === false) tags.push('walk-in-ok')
    const otoshi = yesNo(row[iOtoshi])
    if (otoshi === true) tags.push('otoshi')
    const bottleKeep = (row[iBottleKeep] || '').trim()
    if (bottleKeep === 'あり' || yesNo(bottleKeep) === true) tags.push('bottle-keep')
    const karaokeVal = (row[iKaraoke] || '').trim()
    if (karaokeVal && karaokeVal !== '0') tags.push('karaoke')
    if (cashOnlyVal === true) tags.push('cash-only')

    // Replace tags
    await pool.query('DELETE FROM bar_tags WHERE bar_id = $1', [barId])
    for (const tagId of tags) {
      await pool.query(
        'INSERT INTO bar_tags (bar_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [barId, tagId]
      )
    }
  }

  console.log(`Done: ${inserted} inserted, ${updated} updated`)

  // Stats
  const countResult = await pool.query('SELECT COUNT(*) FROM bars')
  const tagCountResult = await pool.query('SELECT COUNT(*) FROM bar_tags')
  console.log(`Total bars: ${countResult.rows[0].count}`)
  console.log(`Total bar-tag links: ${tagCountResult.rows[0].count}`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
