#!/usr/bin/env node
/**
 * Updates existing bars with data from updatedgoldengai.csv
 * Does NOT insert new bars — only updates matches by name_jp.
 */

import { readFileSync, existsSync } from 'fs'
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

async function main() {
  // Convert ODS → CSV if needed
  if (existsSync(ODS_PATH)) {
    console.log('Converting ODS → CSV...')
    execSync(`libreoffice --headless --convert-to csv "${ODS_PATH}"`, { cwd: ROOT })
  }

  if (!existsSync(CSV_PATH)) {
    console.error('No updatedgoldengai.csv found.')
    process.exit(1)
  }

  const raw = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)
  const headers = rows[0]
  const data = rows.slice(1)

  const col = (name) => headers.indexOf(name)
  const iName = col('名前')
  const iCharge = col('チャージ')
  const iMaleCharge = col('男性')
  const iDrinkPrice = col('ドリンク')
  const iCashOnly = col('現金だけ')
  const iOtoshi = col('お通し付')
  const iBottleKeep = col('ボトルキープ')
  const iSmoking = col('喫煙可能')
  const iEnglish = col('英語可能')
  const iMembers = col('メンバー')
  const iKaraoke = col('カラオケ')

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  // Load all existing bars
  const barsResult = await pool.query('SELECT id, name_jp FROM bars')
  const barsByName = new Map()
  for (const bar of barsResult.rows) {
    // Normalize: strip spaces, fullwidth/halfwidth
    const normalized = bar.name_jp.replace(/\s+/g, '')
    barsByName.set(normalized, bar)
    barsByName.set(bar.name_jp, bar)
  }

  let updated = 0
  let skipped = 0
  let notFound = []

  for (const row of data) {
    const name = (row[iName] || '').trim()
    if (!name) continue

    // Try exact match, then normalized (no spaces)
    let bar = barsByName.get(name) || barsByName.get(name.replace(/\s+/g, ''))
    if (!bar) {
      notFound.push(name)
      continue
    }

    const charge = (row[iCharge] || '').trim() || null
    const maleCharge = (row[iMaleCharge] || '').trim() || null
    const drinkPrice = (row[iDrinkPrice] || '').trim() || null
    const cashOnly = yesNo(row[iCashOnly] || '')

    // Only update if there's something to update
    const hasData = charge || maleCharge || drinkPrice || cashOnly !== null
    if (!hasData) {
      skipped++
      continue
    }

    // Update bar fields
    await pool.query(`
      UPDATE bars SET
        charge = COALESCE($2, charge),
        male_charge = COALESCE($3, male_charge),
        drink_price = COALESCE($4, drink_price),
        cash_only = COALESCE($5, cash_only),
        updated_at = now()
      WHERE id = $1
    `, [bar.id, charge, maleCharge, drinkPrice, cashOnly])

    // Generate tags from spreadsheet
    const tags = []
    const smoking = yesNo(row[iSmoking] || '')
    if (smoking === true) tags.push('smoking')
    if (smoking === false) tags.push('no-smoking')
    const english = yesNo(row[iEnglish] || '')
    if (english === true) tags.push('english-ok')
    if (english === false) tags.push('japanese-only')
    const members = yesNo(row[iMembers] || '')
    if (members === true) tags.push('members-only')
    if (members === false) tags.push('walk-in-ok')
    const otoshi = yesNo(row[iOtoshi] || '')
    if (otoshi === true) tags.push('otoshi')
    const bottleKeep = (row[iBottleKeep] || '').trim()
    if (bottleKeep === 'あり' || yesNo(bottleKeep) === true) tags.push('bottle-keep')
    const karaokeVal = (row[iKaraoke] || '').trim()
    if (karaokeVal && karaokeVal !== '0') tags.push('karaoke')
    if (cashOnly === true) tags.push('cash-only')

    // Update tags (merge, don't replace — keep existing tags not in spreadsheet)
    if (tags.length > 0) {
      for (const tagId of tags) {
        await pool.query(
          'INSERT INTO bar_tags (bar_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [bar.id, tagId]
        )
      }
    }

    updated++
    if (charge || drinkPrice) {
      console.log(`  Updated ${name}: charge=${charge} drink=${drinkPrice} male=${maleCharge} cash=${cashOnly}`)
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (no new data)`)
  if (notFound.length > 0) {
    console.log(`\nNot found in DB (${notFound.length}):`)
    for (const name of notFound) {
      console.log(`  - ${name}`)
    }
  }

  // Stats
  const countResult = await pool.query('SELECT COUNT(*) FROM bars')
  const chargeCount = await pool.query("SELECT COUNT(*) FROM bars WHERE charge IS NOT NULL AND charge != ''")
  const drinkCount = await pool.query("SELECT COUNT(*) FROM bars WHERE drink_price IS NOT NULL AND drink_price != ''")
  const cashCount = await pool.query("SELECT COUNT(*) FROM bars WHERE cash_only = true")
  console.log(`\nTotal bars: ${countResult.rows[0].count}`)
  console.log(`With charge: ${chargeCount.rows[0].count}`)
  console.log(`With drink_price: ${drinkCount.rows[0].count}`)
  console.log(`With cash_only: ${cashCount.rows[0].count}`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
