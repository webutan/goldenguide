import { describe, it, expect } from 'vitest'
import { shuffle } from '../src/utils/shuffle.js'

// Small deterministic generator (mulberry32) so the distribution test is stable
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

describe('shuffle', () => {
  it('returns a new array with the same items and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, seeded(1))
    expect(out).not.toBe(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('handles empty and one-item lists', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['a'])).toEqual(['a'])
  })

  it('follows the random source step by step', () => {
    // random() -> 0 always swaps the last unplaced item with index 0
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1])
    // random() just under 1 swaps each item with itself
    expect(shuffle([1, 2, 3, 4], () => 0.999999)).toEqual([1, 2, 3, 4])
  })

  it('produces every ordering about equally often', () => {
    const random = seeded(42)
    const counts = {}
    const runs = 24000
    for (let i = 0; i < runs; i++) {
      const key = shuffle([1, 2, 3, 4], random).join('')
      counts[key] = (counts[key] || 0) + 1
    }
    expect(Object.keys(counts)).toHaveLength(24)
    for (const n of Object.values(counts)) {
      // expected 1000 each; a random-comparator sort is off by far more
      expect(n).toBeGreaterThan(850)
      expect(n).toBeLessThan(1150)
    }
  })
})
