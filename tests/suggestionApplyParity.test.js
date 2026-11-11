import { describe, it, expect } from 'vitest'
import * as client from '../src/utils/suggestions.js'
import * as server from '../server/lib/suggestionApply.js'
import { pickBarFields } from '../server/lib/validate.js'

// The admin Inbox draws the old -> new diff with src/utils/suggestions.js; the
// server applies a suggestion with server/lib/suggestionApply.js. The two are
// built into different images and cannot share a module, so every case here
// runs through both and must give the same answer.

const bar = {
  id: 7,
  name_jp: 'バー七',
  name_en: 'Bar Seven',
  is_active: true,
  schedule: { default: { open: '18:00', close: '02:00' }, closedDays: ['mon'] },
  charge: '¥500',
  male_charge: null,
  drink_price: '¥700~',
  cash_only: false,
  phone: null,
  sns: 'https://x.com/bar7',
}

const CASES = [
  {
    name: 'hours: a different schedule replaces the whole schedule, canonicalised',
    suggestion: { kind: 'hours', payload: { schedule: { closedDays: ['sun', 'mon'], default: { open: '19:00', close: '03:00' }, overrides: { fri: { open: '19:00', close: '05:00' }, sat: { open: '19:00', close: '03:00' } } } } },
    bar,
    changes: [{
      field: 'schedule',
      from: bar.schedule,
      to: { default: { open: '19:00', close: '03:00' }, overrides: { fri: { open: '19:00', close: '05:00' } }, closedDays: ['sun', 'mon'] },
    }],
  },
  {
    name: 'hours: the same schedule written differently is no change',
    suggestion: { kind: 'hours', payload: { schedule: { default: { open: '18:00', close: '02:00' }, overrides: {}, closedDays: ['mon'] } } },
    bar,
    changes: [],
  },
  {
    name: 'hours: a bar with no schedule yet',
    suggestion: { kind: 'hours', payload: { schedule: { default: { open: '20:00', close: '04:00' }, closedDays: [] } } },
    bar: { ...bar, schedule: null },
    changes: [{ field: 'schedule', from: null, to: { default: { open: '20:00', close: '04:00' }, closedDays: [] } }],
  },
  {
    name: 'hours: an unusable schedule is ignored',
    suggestion: { kind: 'hours', payload: { schedule: { default: { open: '25:00', close: '02:00' } } } },
    bar,
    changes: [],
  },
  {
    name: 'price: only the fields that differ, text trimmed, empty text clears',
    suggestion: { kind: 'price', payload: { charge: ' ¥800 ', male_charge: '', drink_price: '', cash_only: true } },
    bar,
    changes: [
      { field: 'charge', from: '¥500', to: '¥800' },
      { field: 'drink_price', from: '¥700~', to: null },
      { field: 'cash_only', from: false, to: true },
    ],
  },
  {
    name: 'price: the bar was edited since and already matches',
    suggestion: { kind: 'price', payload: { charge: '¥500', cash_only: false } },
    bar,
    changes: [],
  },
  {
    name: 'price: info fields in a price payload are not applied',
    suggestion: { kind: 'price', payload: { name_jp: 'x', phone: '1' } },
    bar,
    changes: [],
  },
  {
    name: 'info: names, phone and link; an empty name_jp never clears the name',
    suggestion: { kind: 'info', payload: { name_jp: '  ', name_en: 'Bar 7', phone: '03-1234-5678', sns: '' } },
    bar,
    changes: [
      { field: 'name_en', from: 'Bar Seven', to: 'Bar 7' },
      { field: 'phone', from: null, to: '03-1234-5678' },
      { field: 'sns', from: 'https://x.com/bar7', to: null },
    ],
  },
  {
    name: 'info: non-text values are ignored',
    suggestion: { kind: 'info', payload: { name_en: 5, phone: null, cash_only: true } },
    bar,
    changes: [],
  },
  {
    name: 'closed: hides an active bar',
    suggestion: { kind: 'closed', payload: {} },
    bar,
    changes: [{ field: 'is_active', from: true, to: false }],
  },
  {
    name: 'closed: a bar that is already hidden',
    suggestion: { kind: 'closed', payload: {} },
    bar: { ...bar, is_active: false },
    changes: [],
  },
  {
    name: 'moved: never applied automatically',
    suggestion: { kind: 'moved', payload: { location: 'G2 street' } },
    bar,
    changes: [],
  },
  {
    name: 'new_bar: never applied automatically',
    suggestion: { kind: 'new_bar', payload: { name: 'Brand new' } },
    bar,
    changes: [],
  },
  { name: 'no bar', suggestion: { kind: 'closed', payload: {} }, bar: null, changes: [] },
  { name: 'no payload', suggestion: { kind: 'price' }, bar, changes: [] },
]

describe('suggestionChanges: Inbox diff (client) and apply (server) agree', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const fromClient = client.suggestionChanges(c.suggestion, c.bar)
      const fromServer = server.suggestionChanges(c.suggestion, c.bar)
      expect(fromServer).toEqual(c.changes)
      expect(fromClient).toEqual(c.changes)
      expect(server.changesToPatch(fromServer)).toEqual(client.changesToPatch(fromClient))
    })
  }

  it('canonicalSchedule and sameSchedule agree on odd input', () => {
    const inputs = [
      null, undefined, {}, { default: null }, { default: { open: '18:00' } },
      { default: { open: '18:00', close: '02:00' } },
      { default: { open: '18:00', close: '02:00' }, closedDays: ['sat', 'sun', 'nope'], overrides: { sat: { open: '12:00', close: '13:00' }, tue: { open: '17:00', close: '01:00' }, wed: { open: 'x', close: 'y' } } },
    ]
    for (const input of inputs) {
      expect(server.canonicalSchedule(input)).toEqual(client.canonicalSchedule(input))
      for (const other of inputs) {
        expect(server.sameSchedule(input, other)).toBe(client.sameSchedule(input, other))
      }
    }
  })
})

describe('server apply rules', () => {
  it('applies hours, price, info and closed; moved and new_bar are manual', () => {
    expect(['hours', 'price', 'info', 'closed'].every(server.isApplicableKind)).toBe(true)
    expect(server.isApplicableKind('moved')).toBe(false)
    expect(server.isApplicableKind('new_bar')).toBe(false)
    expect(server.isApplicableKind(undefined)).toBe(false)
  })

  it('the patch only ever holds columns the bars whitelist accepts', () => {
    for (const c of CASES) {
      const patch = server.changesToPatch(server.suggestionChanges(c.suggestion, c.bar))
      const picked = pickBarFields(patch).map(([key]) => key)
      expect(picked.sort()).toEqual(Object.keys(patch).sort())
    }
  })

  it('"closed" sets is_active to false and nothing else', () => {
    const patch = server.changesToPatch(server.suggestionChanges({ kind: 'closed', payload: {} }, bar))
    expect(patch).toEqual({ is_active: false })
  })
})
