import { describe, it, expect } from 'vitest'
import { sanitizeIds } from '../src/composables/useVisited.js'

describe('sanitizeIds', () => {
  it('keeps valid ids and drops only bad entries', () => {
    expect(sanitizeIds([1, 'x', 2, null, 3.5, '4', 2])).toEqual([1, 2, 4])
  })
  it('returns [] for non-arrays', () => {
    expect(sanitizeIds('nope')).toEqual([])
    expect(sanitizeIds(null)).toEqual([])
  })
})
