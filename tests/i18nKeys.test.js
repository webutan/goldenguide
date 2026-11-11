import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Object literals silently keep the last duplicate key, so check the source text.
const src = readFileSync(fileURLToPath(new URL('../src/composables/useI18n.js', import.meta.url)), 'utf8')
const entryLines = src.split('\n').filter(l => /^\s*'[^']+':\s*\{\s*en:/.test(l))

describe('useI18n translation table', () => {
  it('has no duplicate keys', () => {
    const keys = entryLines.map(l => l.match(/^\s*'([^']+)'/)[1])
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
    expect(keys.length).toBeGreaterThan(50)
    expect(dupes).toEqual([])
  })

  it('every entry has both en and jp', () => {
    for (const l of entryLines) expect(l).toMatch(/jp:/)
  })
})
