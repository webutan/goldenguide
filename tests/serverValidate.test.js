import { describe, it, expect } from 'vitest'
import {
  BAR_FIELDS, pickBarFields, parsePositiveInt, slugify, normalizeTagIds,
  normalizePhotoType, validatePartitionBody, MAX_PARTITIONS,
} from '../server/lib/validate.js'

describe('parsePositiveInt', () => {
  it('accepts positive integer strings and numbers', () => {
    expect(parsePositiveInt('12')).toBe(12)
    expect(parsePositiveInt(7)).toBe(7)
  })
  it('rejects everything else', () => {
    for (const v of ['abc', '12abc', '0', '-1', '1.5', '', ' 1', '01', '99999999999', 0, -3, 1.5, null, undefined, NaN]) {
      expect(parsePositiveInt(v)).toBeNull()
    }
  })
})

describe('pickBarFields', () => {
  it('keeps only allowed fields, in BAR_FIELDS order', () => {
    const out = pickBarFields({ id: 9, slug: 'x', tags: ['a'], name_en: 'Foo', street: 'g1', created_at: 'now' })
    expect(out).toEqual([['name_en', 'Foo'], ['street', 'g1']])
  })
  it('stringifies JSONB fields and keeps null', () => {
    const out = Object.fromEntries(pickBarFields({ other_links: ['a', 'b'], schedule: { default: null }, building_id: null }))
    expect(out.other_links).toBe('["a","b"]')
    expect(out.schedule).toBe('{"default":null}')
    expect(out.building_id).toBeNull()
  })
  it('includes the fields POST used to ignore', () => {
    for (const f of ['building_id', 'drink_price', 'cash_only', 'google_link', 'schedule', 'other_links', 'lat', 'lng']) {
      expect(BAR_FIELDS).toContain(f)
    }
  })
  it('ignores inherited keys and non-objects', () => {
    expect(pickBarFields(Object.create({ name_en: 'x' }))).toEqual([])
    expect(pickBarFields(null)).toEqual([])
  })
})

describe('slugify', () => {
  it('builds ASCII slugs', () => {
    expect(slugify('  Bar Albatross!! ')).toBe('bar-albatross')
    expect(slugify('ＢＡＲ　ＤＵＮＥ')).toBe('bar-dune')
  })
  it('keeps Japanese characters', () => {
    expect(slugify('しの　ぶ')).toBe('しの-ぶ')
  })
  it('returns empty for nothing usable', () => {
    expect(slugify('!!!')).toBe('')
    expect(slugify(undefined)).toBe('')
  })
})

describe('normalizeTagIds', () => {
  it('dedupes valid ids', () => expect(normalizeTagIds(['a', 'b', 'a'])).toEqual(['a', 'b']))
  it('rejects non-arrays and bad items', () => {
    expect(normalizeTagIds('a')).toBeNull()
    expect(normalizeTagIds([1])).toBeNull()
    expect(normalizeTagIds([''])).toBeNull()
  })
})

describe('normalizePhotoType', () => {
  it('defaults to general', () => {
    expect(normalizePhotoType(undefined)).toBe('general')
    expect(normalizePhotoType('')).toBe('general')
  })
  it('allows the allow-list only', () => {
    expect(normalizePhotoType('menu')).toBe('menu')
    expect(normalizePhotoType('<script>')).toBeNull()
    expect(normalizePhotoType(['menu'])).toBeNull()
  })
})

describe('validatePartitionBody', () => {
  it('accepts the shapes the admin panel sends', () => {
    expect(validatePartitionBody({ partitions: [], splitDirection: 'auto' })).toBeNull()
    expect(validatePartitionBody({ partitions: [{ color: null, barIds: ['1'], weight: 1 }], buildingColor: '#fff', labelOffsetX: -3.5 })).toBeNull()
    expect(validatePartitionBody({ buildingColor: '#fff' })).toBeNull()
  })
  it('rejects non-objects', () => {
    for (const b of [null, [], 'x', 3]) expect(validatePartitionBody(b)).toMatch(/object/)
  })
  it('rejects bad partitions arrays', () => {
    expect(validatePartitionBody({ partitions: {} })).toMatch(/array/)
    expect(validatePartitionBody({ partitions: Array.from({ length: MAX_PARTITIONS + 1 }, () => ({})) })).toMatch(/At most/)
    expect(validatePartitionBody({ partitions: [1] })).toMatch(/object/)
  })
  it('rejects non-finite numbers anywhere', () => {
    expect(validatePartitionBody(JSON.parse('{"partitions":[{"weight":1e999}]}'))).toMatch(/finite/)
    expect(validatePartitionBody({ labelFontSize: NaN })).toMatch(/finite/)
  })
  it('rejects bodies over 20 kB', () => {
    expect(validatePartitionBody({ partitions: [], note: 'x'.repeat(21 * 1024) })).toMatch(/too large/)
  })
})
