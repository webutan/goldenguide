import { describe, it, expect } from 'vitest'
import {
  hasNoCover, rouletteCandidates, barWeight, weightedPick, pickBar, reelSequence,
  UNVISITED_WEIGHT, OPEN_WEIGHT,
} from '../src/utils/roulette.js'

// Small deterministic generator (mulberry32), as in shuffle.test.js
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('weightedPick', () => {
  it('returns null when there is nothing to pick', () => {
    expect(weightedPick([])).toBeNull()
    expect(weightedPick(['a', 'b'], () => 0)).toBeNull()
  })

  it('follows the random source ticket by ticket', () => {
    const items = ['a', 'b', 'c']
    const weight = item => ({ a: 1, b: 2, c: 3 }[item]) // tickets: a 0-1, b 1-3, c 3-6
    expect(weightedPick(items, weight, () => 0)).toBe('a')
    expect(weightedPick(items, weight, () => 0.99 / 6)).toBe('a')
    expect(weightedPick(items, weight, () => 1 / 6)).toBe('b')
    expect(weightedPick(items, weight, () => 2.99 / 6)).toBe('b')
    expect(weightedPick(items, weight, () => 3 / 6)).toBe('c')
    expect(weightedPick(items, weight, () => 0.999999)).toBe('c')
  })

  it('never picks an item whose weight is zero, negative or not a number', () => {
    const weight = item => ({ a: 0, b: 1, c: -5, d: NaN }[item])
    const random = seeded(7)
    for (let i = 0; i < 500; i++) expect(weightedPick(['a', 'b', 'c', 'd'], weight, random)).toBe('b')
    // even when the random source misbehaves and returns 1
    expect(weightedPick(['b', 'a'], weight, () => 1)).toBe('b')
  })

  it('picks in proportion to the weights', () => {
    const random = seeded(42)
    const counts = { a: 0, b: 0, c: 0 }
    const runs = 60000
    for (let i = 0; i < runs; i++) counts[weightedPick(['a', 'b', 'c'], item => ({ a: 1, b: 2, c: 3 }[item]), random)]++
    // expected 10000 / 20000 / 30000
    expect(counts.a).toBeGreaterThan(9500)
    expect(counts.a).toBeLessThan(10500)
    expect(counts.b).toBeGreaterThan(19400)
    expect(counts.b).toBeLessThan(20600)
    expect(counts.c).toBeGreaterThan(29300)
    expect(counts.c).toBeLessThan(30700)
  })

  it('is the same spin for the same seed', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const run = () => { const r = seeded(123); return Array.from({ length: 20 }, () => weightedPick(items, () => 1, r)) }
    expect(run()).toEqual(run())
  })
})

describe('barWeight / pickBar', () => {
  const ctx = {
    isVisited: id => id === 2 || id === 4,
    confirmedOpenIds: new Set(['3', '4']),
  }

  it('doubles unvisited bars and triples bars confirmed open', () => {
    expect(barWeight({ id: 1 }, ctx)).toBe(UNVISITED_WEIGHT)               // unvisited, not open
    expect(barWeight({ id: 2 }, ctx)).toBe(1)                              // visited, not open
    expect(barWeight({ id: 3 }, ctx)).toBe(UNVISITED_WEIGHT * OPEN_WEIGHT) // unvisited, open
    expect(barWeight({ id: 4 }, ctx)).toBe(OPEN_WEIGHT)                    // visited, open
    expect(barWeight({ id: 9 })).toBe(UNVISITED_WEIGHT)                    // no context: nothing visited
  })

  it('lands on bars in proportion to those weights', () => {
    const bars = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] // weights 2, 1, 6, 3 of 12
    const random = seeded(2026)
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const runs = 48000
    for (let i = 0; i < runs; i++) counts[pickBar(bars, ctx, random).id]++
    const near = (n, expected) => { expect(n).toBeGreaterThan(expected * 0.94); expect(n).toBeLessThan(expected * 1.06) }
    near(counts[1], 8000)
    near(counts[2], 4000)
    near(counts[3], 24000)
    near(counts[4], 12000)
  })

  it('returns null for an empty draw', () => {
    expect(pickBar([], ctx)).toBeNull()
  })
})

describe('hasNoCover', () => {
  it('is true only for a charge known to be zero', () => {
    expect(hasNoCover({ charge: '0' })).toBe(true)
    expect(hasNoCover({ charge: 0 })).toBe(true)
    expect(hasNoCover({ charge: '¥0' })).toBe(true)
    expect(hasNoCover({ charge: '０円' })).toBe(true)
    expect(hasNoCover({ charge: 'なし' })).toBe(true)
    expect(hasNoCover({ charge: 'Free' })).toBe(true)
    expect(hasNoCover({ charge: ' no charge ' })).toBe(true)
  })

  it('treats an unknown charge as not free', () => {
    expect(hasNoCover({ charge: '' })).toBe(false)
    expect(hasNoCover({ charge: null })).toBe(false)
    expect(hasNoCover({})).toBe(false)
    expect(hasNoCover({ charge: 'ask' })).toBe(false)
  })

  it('is false when there is a charge', () => {
    expect(hasNoCover({ charge: '¥1,000' })).toBe(false)
    expect(hasNoCover({ charge: 500 })).toBe(false)
    expect(hasNoCover({ charge: '0-500' })).toBe(true) // lowest price, as the filters read ranges
  })
})

describe('rouletteCandidates', () => {
  const bars = [
    { id: 1, charge: '0', tags: [{ id: 'english-ok' }], floor: 1 },
    { id: 2, charge: '1000', tags: ['english-ok', 'karaoke'], floor: 2 },
    { id: 3, charge: '', tags: [], floor: 1 },
    { id: 4, charge: 'なし', tags: [{ id: 'karaoke' }], floor: 1, is_active: false },
    { id: 5, charge: '0', tags: [{ id: 'karaoke' }], floor: 2 },
  ]
  const ctx = {
    openBarIds: new Set(['1', '3', '4']),
    isVisited: id => id === 1,
    isFavorited: id => id === 5,
  }
  const ids = list => list.map(b => b.id)

  it('with nothing ticked, every active bar is in the draw', () => {
    expect(ids(rouletteCandidates(bars, {}, ctx))).toEqual([1, 2, 3, 5])
    expect(rouletteCandidates(null)).toEqual([])
  })

  it('applies each option', () => {
    expect(ids(rouletteCandidates(bars, { openNow: true }, ctx))).toEqual([1, 3])
    expect(ids(rouletteCandidates(bars, { unvisited: true }, ctx))).toEqual([2, 3, 5])
    expect(ids(rouletteCandidates(bars, { noCover: true }, ctx))).toEqual([1, 5])
    expect(ids(rouletteCandidates(bars, { english: true }, ctx))).toEqual([1, 2])
  })

  it('combines options (all must hold)', () => {
    expect(ids(rouletteCandidates(bars, { openNow: true, unvisited: true }, ctx))).toEqual([3])
    expect(ids(rouletteCandidates(bars, { noCover: true, english: true, unvisited: true }, ctx))).toEqual([])
  })

  it('applies the map filters through the shared filter function', () => {
    expect(ids(rouletteCandidates(bars, { mapFilters: { floor: 2 } }, ctx))).toEqual([2, 5])
    expect(ids(rouletteCandidates(bars, { mapFilters: { tags: ['karaoke'], favorites: true } }, ctx))).toEqual([5])
    expect(ids(rouletteCandidates(bars, { mapFilters: { openNow: true }, english: true }, ctx))).toEqual([1])
    // unknown prices pass the map's price filter but not "No cover charge"
    expect(ids(rouletteCandidates(bars, { mapFilters: { chargeMax: 500 } }, ctx))).toEqual([1, 3, 5])
    expect(ids(rouletteCandidates(bars, { mapFilters: { chargeMax: 500 }, noCover: true }, ctx))).toEqual([1, 5])
  })
})

describe('reelSequence', () => {
  const bars = Array.from({ length: 12 }, (_, i) => ({ id: i }))

  it('ends on the winner and has the asked length', () => {
    const reel = reelSequence(bars, bars[5], 20, seeded(1))
    expect(reel).toHaveLength(20)
    expect(reel[19]).toBe(bars[5])
  })

  it('never shows the same bar twice in a row', () => {
    const random = seeded(9)
    for (let run = 0; run < 50; run++) {
      const reel = reelSequence(bars.slice(0, 3), bars[0], 20, random)
      for (let i = 1; i < reel.length; i++) expect(reel[i]).not.toBe(reel[i - 1])
    }
  })

  it('copes with one or two candidates', () => {
    expect(reelSequence([bars[0]], bars[0], 20)).toEqual([bars[0]])
    const random = seeded(3)
    for (let run = 0; run < 50; run++) {
      const two = reelSequence([bars[0], bars[1]], bars[1], 6, random)
      expect(two[two.length - 1]).toBe(bars[1])
      expect(two.length).toBeGreaterThan(1)
      for (let i = 1; i < two.length; i++) expect(two[i]).not.toBe(two[i - 1])
    }
  })
})
