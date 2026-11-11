import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  validateSuggestionBody, validateSuggestionItem, normalizeSchedule, parseSuggestionFilter,
  MAX_NOTE_LENGTH, MAX_CONTACT_LENGTH, MAX_ITEMS,
} from '../server/lib/suggestions.js'
import { hashIp } from '../server/lib/ipHash.js'
import { reporterKey } from '../server/lib/reviewModeration.js'
import { SUGGESTION_WINDOW_MS, SUGGESTION_MAX } from '../server/middleware/rateLimits.js'

const schedule = { default: { open: '18:00', close: '02:00' }, overrides: { fri: { open: '18:00', close: '05:00' } }, closedDays: ['mon'] }
const ok = body => validateSuggestionBody(body).value
const err = body => validateSuggestionBody(body).error

describe('normalizeSchedule', () => {
  it('accepts the openNow shape and orders closed days', () => {
    expect(normalizeSchedule(schedule)).toEqual(schedule)
    expect(normalizeSchedule({ default: { open: '19:00', close: '03:00' }, closedDays: ['sat', 'sun'] }))
      .toEqual({ default: { open: '19:00', close: '03:00' }, closedDays: ['sun', 'sat'] })
    expect(normalizeSchedule({ default: { open: '19:00', close: '03:00' }, overrides: {} }))
      .toEqual({ default: { open: '19:00', close: '03:00' }, closedDays: [] })
  })
  it('rejects bad times, days, shapes and extra keys', () => {
    const bad = [
      null, 'x', [], {},
      { default: { open: '25:00', close: '02:00' } },
      { default: { open: '18:00', close: '2:00' } },
      { default: { open: '18:00' } },
      { default: { open: 1800, close: 200 } },
      { default: { open: '18:00', close: '02:00', note: 'x' } },
      { default: { open: '18:00', close: '02:00' }, extra: 1 },
      { default: { open: '18:00', close: '02:00' }, closedDays: ['monday'] },
      { default: { open: '18:00', close: '02:00' }, closedDays: ['mon', 'mon'] },
      { default: { open: '18:00', close: '02:00' }, closedDays: 'mon' },
      { default: { open: '18:00', close: '02:00' }, overrides: { friday: { open: '18:00', close: '05:00' } } },
      { default: { open: '18:00', close: '02:00' }, overrides: { fri: { open: '18:00' } } },
      { default: { open: '18:00', close: '02:00' }, overrides: [] },
    ]
    for (const value of bad) expect(normalizeSchedule(value), JSON.stringify(value)).toBeNull()
  })
})

describe('validateSuggestionItem', () => {
  it('hours: schedule only', () => {
    expect(validateSuggestionItem({ kind: 'hours', payload: { schedule } }).value).toEqual({ kind: 'hours', payload: { schedule } })
    expect(validateSuggestionItem({ kind: 'hours', payload: { schedule, hours: '18-2' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'hours', payload: {} }).error).toBeTruthy()
  })
  it('price: text stays text, trimmed and capped; cash_only is boolean', () => {
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: ' ¥1,000 ', cash_only: true } }).value.payload)
      .toEqual({ charge: '¥1,000', cash_only: true })
    expect(validateSuggestionItem({ kind: 'price', payload: { drink_price: '' } }).value.payload).toEqual({ drink_price: '' })
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: 1000 } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: 'x'.repeat(61) } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: { cash_only: 'yes' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: {} }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: { is_active: false } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: '500', map_x: 1 } }).error).toBeTruthy()
  })
  it('closed: empty payload only', () => {
    expect(validateSuggestionItem({ kind: 'closed', payload: {} }).value).toEqual({ kind: 'closed', payload: {} })
    expect(validateSuggestionItem({ kind: 'closed' }).value).toEqual({ kind: 'closed', payload: {} })
    expect(validateSuggestionItem({ kind: 'closed', payload: { is_active: false } }).error).toBeTruthy()
  })
  it('moved: needs a location', () => {
    expect(validateSuggestionItem({ kind: 'moved', payload: { location: ' G2 street, 2F ' } }).value.payload).toEqual({ location: 'G2 street, 2F' })
    expect(validateSuggestionItem({ kind: 'moved', payload: { location: '  ' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'moved', payload: { location: 'x'.repeat(301) } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'moved', payload: { location: 'a', building_id: 'b1' } }).error).toBeTruthy()
  })
  it('info: known fields, http(s) links only, name_jp never empty', () => {
    expect(validateSuggestionItem({ kind: 'info', payload: { phone: '03-1234-5678', sns: 'https://x.com/bar' } }).value.payload)
      .toEqual({ phone: '03-1234-5678', sns: 'https://x.com/bar' })
    expect(validateSuggestionItem({ kind: 'info', payload: { sns: '' } }).value.payload).toEqual({ sns: '' })
    expect(validateSuggestionItem({ kind: 'info', payload: { sns: 'javascript:alert(1)' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'info', payload: { name_jp: ' ' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'info', payload: { slug: 'x' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'info', payload: { phone: 'x'.repeat(41) } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'info', payload: {} }).error).toBeTruthy()
  })
  it('new_bar: name required, empty extras dropped', () => {
    expect(validateSuggestionItem({ kind: 'new_bar', payload: { name: ' Bar X ', location: '', details: 'opens 20:00' } }).value.payload)
      .toEqual({ name: 'Bar X', details: 'opens 20:00' })
    expect(validateSuggestionItem({ kind: 'new_bar', payload: { location: 'G1' } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'new_bar', payload: { name: 'x'.repeat(121) } }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'new_bar', payload: { name: 'a', lat: 1 } }).error).toBeTruthy()
  })
  it('rejects unknown kinds, non-object payloads and payloads over 4 kB', () => {
    expect(validateSuggestionItem({ kind: 'delete', payload: {} }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: ['charge'] }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: 'charge=1' }).error).toBeTruthy()
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: 'x'.repeat(5000) } }).error).toMatch(/too large/)
    expect(validateSuggestionItem({ kind: 'price', payload: { charge: '1' }, status: 'applied' }).error).toBeTruthy()
    expect(validateSuggestionItem(null).error).toBeTruthy()
  })
})

describe('validateSuggestionBody', () => {
  it('accepts a single change', () => {
    expect(ok({ bar_id: 7, kind: 'price', payload: { charge: '800' }, note: ' saw it today ', contact: 'a@b.c' })).toEqual({
      barId: 7, items: [{ kind: 'price', payload: { charge: '800' } }], note: 'saw it today', contact: 'a@b.c', bot: false,
    })
  })
  it('accepts up to MAX_ITEMS changes of different kinds', () => {
    const items = [{ kind: 'hours', payload: { schedule } }, { kind: 'price', payload: { charge: '1' } }, { kind: 'info', payload: { phone: '1' } }]
    expect(MAX_ITEMS).toBe(4)
    expect(ok({ bar_id: 1, items }).items).toHaveLength(3)
    const five = [...items, { kind: 'moved', payload: { location: 'x' } }, { kind: 'closed', payload: {} }]
    expect(err({ bar_id: 1, items: five })).toBeTruthy()
    expect(err({ bar_id: 1, items: [] })).toBeTruthy()
    expect(err({ bar_id: 1, items: [items[1], items[1]] })).toMatch(/only once/)
    expect(err({ bar_id: 1, items, kind: 'closed' })).toBeTruthy()
  })
  it('requires a bar except for new_bar, which must not have one', () => {
    expect(err({ kind: 'closed', payload: {} })).toMatch(/bar_id/)
    expect(err({ bar_id: '7', kind: 'closed', payload: {} })).toMatch(/bar_id/)
    expect(err({ bar_id: 0, kind: 'closed' })).toMatch(/bar_id/)
    expect(err({ bar_id: 1.5, kind: 'closed' })).toMatch(/bar_id/)
    expect(ok({ bar_id: null, kind: 'new_bar', payload: { name: 'X' } }).barId).toBeNull()
    expect(ok({ kind: 'new_bar', payload: { name: 'X' } }).barId).toBeNull()
    expect(err({ bar_id: 3, kind: 'new_bar', payload: { name: 'X' } })).toBeTruthy()
    expect(err({ items: [{ kind: 'new_bar', payload: { name: 'X' } }, { kind: 'closed', payload: {} }] })).toBeTruthy()
  })
  it('caps note and contact, and turns blanks into null', () => {
    expect(ok({ bar_id: 1, kind: 'closed', note: '  ', contact: '' })).toMatchObject({ note: null, contact: null })
    expect(ok({ bar_id: 1, kind: 'closed', note: 'x'.repeat(MAX_NOTE_LENGTH) }).note).toHaveLength(MAX_NOTE_LENGTH)
    expect(err({ bar_id: 1, kind: 'closed', note: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).toMatch(/note/)
    expect(err({ bar_id: 1, kind: 'closed', contact: 'x'.repeat(MAX_CONTACT_LENGTH + 1) })).toMatch(/contact/)
    expect(err({ bar_id: 1, kind: 'closed', note: { a: 1 } })).toMatch(/note/)
  })
  it('rejects unknown top-level fields and non-objects', () => {
    expect(err({ bar_id: 1, kind: 'closed', status: 'applied' })).toMatch(/status/)
    expect(err({ bar_id: 1, kind: 'closed', ip_hash: 'x' })).toBeTruthy()
    expect(err(null)).toBeTruthy()
    expect(err([])).toBeTruthy()
    expect(err('x')).toBeTruthy()
  })
  it('flags a filled-in honeypot', () => {
    expect(ok({ bar_id: 1, kind: 'closed', website: '' }).bot).toBe(false)
    expect(ok({ bar_id: 1, kind: 'closed', website: 'http://spam.example' }).bot).toBe(true)
  })
})

describe('parseSuggestionFilter', () => {
  it('falls back to open', () => {
    expect(parseSuggestionFilter('applied')).toBe('applied')
    expect(parseSuggestionFilter('all')).toBe('all')
    expect(parseSuggestionFilter('nope')).toBe('open')
    expect(parseSuggestionFilter(undefined)).toBe('open')
  })
})

describe('hashIp', () => {
  it('is stable, keyed, and never contains the address', () => {
    const a = hashIp('203.0.113.7', 's')
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).toBe(hashIp('203.0.113.7', 's'))
    expect(a).not.toBe(hashIp('203.0.113.8', 's'))
    expect(a).not.toBe(hashIp('203.0.113.7', 'other'))
    // The review-report key is the same function
    expect(reporterKey('203.0.113.7', 's')).toBe(a)
  })
})

describe('suggestion rate limit and migration', () => {
  it('is 5 per hour', () => {
    expect(SUGGESTION_MAX).toBe(5)
    expect(SUGGESTION_WINDOW_MS).toBe(60 * 60 * 1000)
  })
  it('migration 016 creates bar_suggestions without a raw IP column', () => {
    // migrate.js opens a DB pool on import, so check its source text instead.
    const src = readFileSync(fileURLToPath(new URL('../server/migrate.js', import.meta.url)), 'utf8')
    const block = src.slice(src.indexOf("name: '016-suggestions'"))
    expect(block).toContain('CREATE TABLE IF NOT EXISTS bar_suggestions')
    expect(block).toContain('ip_hash')
    expect(block).not.toMatch(/\bip\s+(TEXT|INET)/i)
  })
})
