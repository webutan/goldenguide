#!/usr/bin/env node
// Fill an empty dev database with the bars in scripts/data/bars.json, through the
// admin API (so it also exercises POST /api/bars). Dev only — never run this
// against production. Buildings, prices, schedules and tags are made-up
// placeholders so the map, filters and "Open Now" have something to show.
//
//   API=http://localhost:3001 ADMIN_PASSWORD=devpass node scripts/dev-seed.mjs
import { readFileSync } from 'node:fs'

const API = process.env.API || 'http://localhost:3001'
const headers = { 'Content-Type': 'application/json', 'X-Admin-Password': process.env.ADMIN_PASSWORD || '' }
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)))
const bars = read('./data/bars.json')
const buildings = read('../src/data/buildings.json')
const tags = await (await fetch(`${API}/api/tags`)).json()

const existing = await (await fetch(`${API}/api/bars`, { headers })).json()
if (existing.length > 0) {
  console.error(`Database already has ${existing.length} bars; refusing to seed.`)
  process.exit(1)
}

let ok = 0, failed = 0
for (const [i, b] of bars.entries()) {
  const body = {
    name_jp: b.name_jp, name_en: b.name_en || undefined, street: b.street, floor: b.floor || 1,
    address: b.address, plus_code: b.plus_code, sns: b.sns, hours: b.hours,
    building_id: buildings[i % buildings.length].id,
    charge: i % 3 === 0 ? String(500 + (i % 5) * 250) : (i % 7 === 1 ? '¥1,000' : undefined),
    drink_price: i % 4 === 0 ? String(600 + (i % 4) * 100) : undefined,
    schedule: i % 2 === 0 ? { default: { open: '19:00', close: '03:00' }, closedDays: i % 6 === 0 ? ['sun'] : [] } : undefined,
    tags: tags.length ? [tags[i % tags.length].id, ...(i % 5 === 0 ? [tags[(i + 1) % tags.length].id] : [])] : [],
    is_active: i % 40 === 39 ? false : undefined,
  }
  const res = await fetch(`${API}/api/bars`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (res.ok) ok++
  else { failed++; console.error(res.status, await res.text(), b.name_jp) }
}
console.log(`seeded ${ok} bars (${failed} failed)`)
