#!/usr/bin/env node
/**
 * Converts goldengai.ods → src/data/bars.json
 *
 * Usage:
 *   npm run convert            # converts ODS → CSV → JSON
 *   node scripts/convert.js    # same thing (expects goldengai.csv to exist)
 *
 * The ODS spreadsheet is the source of truth. This script:
 *   1. Calls LibreOffice to convert ODS → CSV (if ODS is newer)
 *   2. Parses the CSV
 *   3. Writes src/data/bars.json
 *
 * Columns expected (Japanese headers):
 *   名前, 番街, 住所, (empty), Plus Code, 階, チャージ, 男性, お通し付, 席,
 *   電話, 営業時間, ボトルキープ, 定休日, 喫煙可能, 英語可能, メンバー, 説明, SNS
 */

import { readFileSync, writeFileSync, statSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ODS_PATH = resolve(ROOT, 'goldengai.ods')
const CSV_PATH = resolve(ROOT, 'goldengai.csv')
const OUT_PATH = resolve(ROOT, 'src/data/bars.json')

// Street ID mapping
const STREET_MAP = {
  '一番': 'hanazono-1',
  '三番': 'hanazono-3',
  '五番': 'hanazono-5',
  '八番': 'hanazono-8',
  'マ': 'maneki-dori',
  'ま': 'maneki-dori',
}

const STREET_NAMES = {
  'hanazono-1': { name_en: 'Akarui Hanazono 1 Bangai', name_jp: 'あかるい花園1番街' },
  'hanazono-3': { name_en: 'Akarui Hanazono 3 Bangai', name_jp: 'あかるい花園3番街' },
  'hanazono-5': { name_en: 'Akarui Hanazono 5 Bangai', name_jp: 'あかるい花園5番街' },
  'hanazono-8': { name_en: 'Akarui Hanazono 8 Bangai', name_jp: 'あかるい花園8番街' },
  'maneki-dori': { name_en: 'Maneki-dori', name_jp: 'まねき通り' },
}

// --- CSV parsing (handles quoted fields with commas/newlines) ---
function parseCSV(text) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field)
        field = ''
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field)
        field = ''
        if (current.some(f => f.trim())) rows.push(current)
        current = []
        if (ch === '\r') i++
      } else {
        field += ch
      }
    }
  }
  // last field/row
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

function normalizePhone(val) {
  if (!val) return ''
  // If it's just digits (no dashes), could be missing leading 0 or country code
  const digits = val.replace(/[^\d]/g, '')
  if (!digits) return ''
  return val.trim()
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Main ---
function main() {
  // Step 1: Convert ODS → CSV if needed
  if (existsSync(ODS_PATH)) {
    const needsConvert = !existsSync(CSV_PATH) ||
      statSync(ODS_PATH).mtimeMs > statSync(CSV_PATH).mtimeMs
    if (needsConvert) {
      console.log('Converting ODS → CSV...')
      execSync(`libreoffice --headless --convert-to csv "${ODS_PATH}"`, { cwd: ROOT })
    }
  }

  if (!existsSync(CSV_PATH)) {
    console.error('No goldengai.csv found. Place goldengai.ods in the project root.')
    process.exit(1)
  }

  // Step 2: Parse CSV
  const raw = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)
  const headers = rows[0]
  const data = rows.slice(1)

  console.log(`Parsed ${data.length} rows from CSV`)
  console.log(`Headers: ${headers.join(', ')}`)

  // Map column indices
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
  const iDescription = col('説明')
  const iSNS = col('SNS')

  // Step 3: Build bars array
  const bars = []
  const usedIds = new Set()

  for (const row of data) {
    const name = (row[iName] || '').trim()
    if (!name) continue

    const streetRaw = (row[iStreet] || '').trim()
    const street = STREET_MAP[streetRaw] || streetRaw
    const floor = parseInt(row[iFloor]) || 1

    // Generate unique ID from name
    let id = slugify(name) || `bar-${bars.length}`
    if (!id) id = `bar-${bars.length}`
    if (usedIds.has(id)) {
      id = `${id}-${floor}f`
    }
    usedIds.add(id)

    // Auto-generate tags from boolean columns
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

    const bar = {
      id,
      name_jp: name,
      name_en: '',  // To be filled in manually
      street,
      address: (row[iAddress] || '').trim(),
      plus_code: (row[iPlusCode] || '').trim(),
      floor,
      charge: (row[iCharge] || '').trim(),
      male_charge: (row[iMaleCharge] || '').trim(),
      seats: parseInt(row[iSeats]) || null,
      phone: normalizePhone(row[iPhone] || ''),
      hours: (row[iHours] || '').trim(),
      closed_days: (row[iClosedDays] || '').trim(),
      tags,
      description: (row[iDescription] || '').trim(),
      sns: (row[iSNS] || '').trim(),
      position: null,  // To be mapped from PDF layout later
    }

    bars.push(bar)
  }

  // Step 4: Write output
  writeFileSync(OUT_PATH, JSON.stringify(bars, null, 2) + '\n')
  console.log(`\nWrote ${bars.length} bars to ${OUT_PATH}`)

  // Stats
  const streets = {}
  for (const bar of bars) {
    streets[bar.street] = (streets[bar.street] || 0) + 1
  }
  console.log('\nBars per street:')
  for (const [s, count] of Object.entries(streets).sort()) {
    const info = STREET_NAMES[s]
    console.log(`  ${s} ${info ? `(${info.name_jp})` : ''}: ${count}`)
  }

  const withTags = bars.filter(b => b.tags.length > 0).length
  const withAddress = bars.filter(b => b.address).length
  const withPhone = bars.filter(b => b.phone).length
  const withHours = bars.filter(b => b.hours).length
  const withSNS = bars.filter(b => b.sns).length
  console.log(`\nData completeness:`)
  console.log(`  Tags:    ${withTags}/${bars.length}`)
  console.log(`  Address: ${withAddress}/${bars.length}`)
  console.log(`  Phone:   ${withPhone}/${bars.length}`)
  console.log(`  Hours:   ${withHours}/${bars.length}`)
  console.log(`  SNS:     ${withSNS}/${bars.length}`)
}

main()
