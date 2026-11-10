import { describe, it, expect } from 'vitest'
import { parsePrice, barPasses, hasActiveFilters, hasUnknownFilteredPrice } from '../src/utils/barFilters.js'

const bar = (over = {}) => ({ id: 1, floor: 1, tags: [], charge: null, drink_price: null, ...over })

describe('parsePrice', () => {
  it('parses plain and formatted values', () => {
    expect(parsePrice('800')).toBe(800)
    expect(parsePrice(1500)).toBe(1500)
    expect(parsePrice('¥1,000')).toBe(1000)
    expect(parsePrice(' 1,200円 ')).toBe(1200)
  })
  it('returns null for unknown or unparseable', () => {
    expect(parsePrice(null)).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('varies')).toBeNull()
    expect(parsePrice(NaN)).toBeNull()
  })
})

describe('barPasses — tags', () => {
  const b = bar({ tags: ['a', { id: 'b' }] })
  const bOnlyA = bar({ tags: ['a'] })
  it('OR mode matches any tag', () => {
    expect(barPasses(bOnlyA, { tags: ['a', 'b'], tagMode: 'or' })).toBe(true)
    expect(barPasses(bOnlyA, { tags: ['b', 'c'] })).toBe(false)
  })
  it('AND mode requires every tag (string or object tags)', () => {
    expect(barPasses(b, { tags: ['a', 'b'], tagMode: 'and' })).toBe(true)
    expect(barPasses(bOnlyA, { tags: ['a', 'b'], tagMode: 'and' })).toBe(false)
  })
  it('no tags selected passes everything', () => {
    expect(barPasses(bar(), { tags: [] })).toBe(true)
  })
})

describe('barPasses — prices', () => {
  const cheap = bar({ charge: '500', drink_price: '¥700' })
  const pricey = bar({ charge: '¥1,500', drink_price: '1,200' })
  it('chargeMin', () => {
    expect(barPasses(cheap, { chargeMin: 1000 })).toBe(false)
    expect(barPasses(pricey, { chargeMin: 1000 })).toBe(true)
  })
  it('chargeMax', () => {
    expect(barPasses(cheap, { chargeMax: 1000 })).toBe(true)
    expect(barPasses(pricey, { chargeMax: 1000 })).toBe(false)
  })
  it('drinkMin', () => {
    expect(barPasses(cheap, { drinkMin: 1000 })).toBe(false)
    expect(barPasses(pricey, { drinkMin: 1000 })).toBe(true)
  })
  it('drinkMax', () => {
    expect(barPasses(cheap, { drinkMax: 1000 })).toBe(true)
    expect(barPasses(pricey, { drinkMax: 1000 })).toBe(false)
  })
  it('bounds are inclusive', () => {
    expect(barPasses(cheap, { chargeMin: 500, chargeMax: 500 })).toBe(true)
  })
  it('unknown or unparseable price passes every price bound', () => {
    const f = { chargeMin: 1000, chargeMax: 2000, drinkMin: 1000, drinkMax: 2000 }
    expect(barPasses(bar(), f)).toBe(true)
    expect(barPasses(bar({ charge: 'varies', drink_price: '' }), f)).toBe(true)
  })
  it('hasUnknownFilteredPrice flags only when a relevant price filter is active', () => {
    expect(hasUnknownFilteredPrice(bar(), {})).toBe(false)
    expect(hasUnknownFilteredPrice(bar(), { chargeMin: 500 })).toBe(true)
    expect(hasUnknownFilteredPrice(bar({ charge: '800' }), { chargeMin: 500 })).toBe(false)
    expect(hasUnknownFilteredPrice(bar({ charge: '800' }), { drinkMax: 500 })).toBe(true)
  })
})

describe('barPasses — floor', () => {
  it('defaults missing floor to 1', () => {
    expect(barPasses(bar({ floor: undefined }), { floor: 1 })).toBe(true)
    expect(barPasses(bar({ floor: null }), { floor: 2 })).toBe(false)
  })
  it('floor 0 is a real filter, not "no filter"', () => {
    expect(barPasses(bar({ floor: 0 }), { floor: 0 })).toBe(true)
    expect(barPasses(bar({ floor: 1 }), { floor: 0 })).toBe(false)
    expect(hasActiveFilters({ floor: 0 })).toBe(true)
  })
  it('negative (basement) floors', () => {
    expect(barPasses(bar({ floor: -1 }), { floor: -1 })).toBe(true)
    expect(barPasses(bar({ floor: '-1' }), { floor: -1 })).toBe(true)
    expect(barPasses(bar({ floor: -2 }), { floor: -1 })).toBe(false)
  })
})

describe('barPasses — status filters', () => {
  const b = bar({ id: 42 })
  it('openNow uses openBarIds (string ids)', () => {
    expect(barPasses(b, { openNow: true }, { openBarIds: new Set(['42']) })).toBe(true)
    expect(barPasses(b, { openNow: true }, { openBarIds: new Set(['7']) })).toBe(false)
    expect(barPasses(b, { openNow: true }, {})).toBe(false)
    expect(barPasses(b, { openNow: false }, { openBarIds: new Set() })).toBe(true)
  })
  it('favorites and visited', () => {
    const yes = () => true
    const no = () => false
    expect(barPasses(b, { favorites: true }, { isFavorited: yes })).toBe(true)
    expect(barPasses(b, { favorites: true }, { isFavorited: no })).toBe(false)
    expect(barPasses(b, { visited: true }, { isVisited: yes })).toBe(true)
    expect(barPasses(b, { visited: true }, { isVisited: no })).toBe(false)
  })
})

describe('hasActiveFilters', () => {
  it('is false for empty filters', () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ tags: [], tagMode: 'and', floor: null, openNow: false })).toBe(false)
  })
  it('detects each filter', () => {
    for (const f of [{ tags: ['a'] }, { chargeMin: 0 }, { chargeMax: 1 }, { drinkMin: 0 }, { drinkMax: 1 },
      { floor: -1 }, { openNow: true }, { favorites: true }, { visited: true }]) {
      expect(hasActiveFilters(f)).toBe(true)
    }
  })
})

import { yen } from '../src/utils/barFilters.js'
describe('yen', () => {
  it('adds exactly one yen sign', () => {
    expect(yen('1000')).toBe('¥1000')
    expect(yen('¥1,000')).toBe('¥1,000')
    expect(yen('￥ 500')).toBe('¥500')
    expect(yen(null)).toBe('')
  })
})
