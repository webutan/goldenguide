import { describe, it, expect } from 'vitest'
import {
  canonicalSchedule, sameSchedule, formatSchedule, barToForm, formToSchedule,
  buildSuggestionItems, suggestionChanges, changesToPatch,
} from '../src/utils/suggestions.js'
import { validateSuggestionBody } from '../server/lib/suggestions.js'

const bar = {
  id: 5, name_jp: '奥亭', name_en: 'Okutei', is_active: true,
  schedule: { default: { open: '19:00', close: '03:00' }, closedDays: ['sun'] },
  charge: '500', male_charge: null, drink_price: '600', cash_only: null, phone: null, sns: 'https://x.com/okutei',
}

describe('canonicalSchedule / sameSchedule', () => {
  it('treats empty and unusable schedules as null', () => {
    expect(canonicalSchedule({})).toBeNull()
    expect(canonicalSchedule(null)).toBeNull()
    expect(canonicalSchedule({ default: { open: '19:00' } })).toBeNull()
    expect(sameSchedule({}, null)).toBe(true)
  })
  it('ignores key order, empty overrides, redundant overrides and closed-day order', () => {
    const a = { default: { open: '19:00', close: '03:00' }, closedDays: ['sat', 'sun'] }
    const b = { closedDays: ['sun', 'sat'], overrides: { mon: { close: '03:00', open: '19:00' } }, default: { close: '03:00', open: '19:00' } }
    expect(sameSchedule(a, b)).toBe(true)
    expect(sameSchedule(a, { ...a, closedDays: ['sun'] })).toBe(false)
    expect(sameSchedule(a, { ...a, overrides: { fri: { open: '19:00', close: '05:00' } } })).toBe(false)
  })
})

describe('formatSchedule', () => {
  it('lists usual hours, overrides and closed days', () => {
    const s = { default: { open: '18:00', close: '02:00' }, overrides: { fri: { open: '18:00', close: '05:00' } }, closedDays: ['mon'] }
    expect(formatSchedule(s, d => d.toUpperCase(), 'Closed')).toBe('18:00–02:00 · FRI 18:00–05:00 · Closed: MON')
    expect(formatSchedule({})).toBe('')
  })
})

describe('barToForm / formToSchedule', () => {
  it('round-trips the current schedule', () => {
    const form = barToForm(bar)
    expect(form.open).toBe('19:00')
    expect(form.days.sun.closed).toBe(true)
    expect(form.charge).toBe('500')
    expect(form.male_charge).toBe('')
    expect(formToSchedule(form)).toEqual({ schedule: canonicalSchedule(bar.schedule), error: null })
  })
  it('an empty form is no schedule, not an error', () => {
    expect(formToSchedule(barToForm({ id: 1, name_jp: 'x', schedule: {} }))).toEqual({ schedule: null, error: null })
  })
  it('reports half-filled times', () => {
    const form = barToForm(bar)
    form.close = ''
    expect(formToSchedule(form).error).toBe('suggestHoursIncomplete')
    const form2 = barToForm(bar)
    form2.days.fri.custom = true
    form2.days.fri.open = '18:00'
    expect(formToSchedule(form2).error).toBe('suggestHoursIncomplete')
    const form3 = barToForm({ id: 1, name_jp: 'x', schedule: {} })
    form3.days.mon.closed = true
    expect(formToSchedule(form3).error).toBe('suggestHoursIncomplete')
  })
})

describe('buildSuggestionItems', () => {
  it('sends nothing when nothing changed', () => {
    expect(buildSuggestionItems(bar, barToForm(bar))).toEqual({ items: [], error: null })
  })
  it('sends only the changed fields, grouped by kind, in a shape the server accepts', () => {
    const form = barToForm(bar)
    form.days.fri.custom = true
    form.days.fri.open = '19:00'
    form.days.fri.close = '05:00'
    form.charge = '800'
    form.cash_only = true
    form.phone = '03-1111-2222'
    form.moved = true
    form.location = 'G2, 2F'
    const { items, error } = buildSuggestionItems(bar, form)
    expect(error).toBeNull()
    expect(items).toEqual([
      { kind: 'hours', payload: { schedule: { default: { open: '19:00', close: '03:00' }, overrides: { fri: { open: '19:00', close: '05:00' } }, closedDays: ['sun'] } } },
      { kind: 'price', payload: { charge: '800', cash_only: true } },
      { kind: 'info', payload: { phone: '03-1111-2222' } },
      { kind: 'moved', payload: { location: 'G2, 2F' } },
    ])
    const result = validateSuggestionBody({ bar_id: bar.id, items, note: '', contact: '', website: '' })
    expect(result.error).toBeUndefined()
    expect(result.value.items).toEqual(items)
  })
  it('clearing a price is a change to empty text', () => {
    const form = barToForm(bar)
    form.drink_price = ''
    expect(buildSuggestionItems(bar, form).items).toEqual([{ kind: 'price', payload: { drink_price: '' } }])
  })
  it('validates name, link and move target', () => {
    const f1 = barToForm(bar); f1.name_jp = ' '
    expect(buildSuggestionItems(bar, f1).error).toBe('suggestNameRequired')
    const f2 = barToForm(bar); f2.sns = 'javascript:alert(1)'
    expect(buildSuggestionItems(bar, f2).error).toBe('suggestLinkInvalid')
    const f3 = barToForm(bar); f3.moved = true
    expect(buildSuggestionItems(bar, f3).error).toBe('suggestLocationRequired')
    f3.location = 'G2, 2F'
    expect(buildSuggestionItems(bar, f3).items).toEqual([{ kind: 'moved', payload: { location: 'G2, 2F' } }])
  })
})

describe('suggestionChanges / changesToPatch', () => {
  it('diffs against the bar as it is now, not as it was when suggested', () => {
    const s = { kind: 'price', payload: { charge: '800', drink_price: '700' } }
    expect(suggestionChanges(s, bar)).toEqual([
      { field: 'charge', from: '500', to: '800' },
      { field: 'drink_price', from: '600', to: '700' },
    ])
    // Someone already changed the cover charge: only the drink price is left
    const changes = suggestionChanges(s, { ...bar, charge: '800' })
    expect(changes).toEqual([{ field: 'drink_price', from: '600', to: '700' }])
    expect(changesToPatch(changes)).toEqual({ drink_price: '700' })
  })
  it('cleared text becomes null; cash_only compares as a boolean', () => {
    expect(suggestionChanges({ kind: 'price', payload: { drink_price: '', cash_only: false } }, bar))
      .toEqual([{ field: 'drink_price', from: '600', to: null }])
    expect(suggestionChanges({ kind: 'price', payload: { cash_only: true } }, bar))
      .toEqual([{ field: 'cash_only', from: false, to: true }])
  })
  it('hours: one schedule change, none when equal', () => {
    const schedule = { default: { open: '20:00', close: '04:00' }, closedDays: [] }
    expect(suggestionChanges({ kind: 'hours', payload: { schedule } }, bar))
      .toEqual([{ field: 'schedule', from: bar.schedule, to: schedule }])
    expect(suggestionChanges({ kind: 'hours', payload: { schedule: bar.schedule } }, bar)).toEqual([])
  })
  it('closed hides the bar, once', () => {
    const changes = suggestionChanges({ kind: 'closed', payload: {} }, bar)
    expect(changesToPatch(changes)).toEqual({ is_active: false })
    expect(suggestionChanges({ kind: 'closed', payload: {} }, { ...bar, is_active: false })).toEqual([])
  })
  it('info never blanks the required name; moved / new_bar are manual', () => {
    expect(suggestionChanges({ kind: 'info', payload: { name_jp: '', phone: '03' } }, bar))
      .toEqual([{ field: 'phone', from: null, to: '03' }])
    expect(suggestionChanges({ kind: 'moved', payload: { location: 'x' } }, bar)).toEqual([])
    expect(suggestionChanges({ kind: 'new_bar', payload: { name: 'x' } }, null)).toEqual([])
  })
  it('ignores fields outside the kind (a price suggestion cannot touch is_active)', () => {
    expect(suggestionChanges({ kind: 'price', payload: { is_active: false, name_jp: 'x' } }, bar)).toEqual([])
  })
})
