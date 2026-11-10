import { describe, it, expect } from 'vitest'
import {
  isValidHandle, parseTwitterHandle, allowedHandles, createSingleFlight, createCachedFetcher,
} from '../server/lib/feedCore.js'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('isValidHandle', () => {
  it('accepts 1-15 letters, digits and underscores', () => {
    for (const h of ['a', 'Bar_Albatross', 'x1234567890abcd', '___']) expect(isValidHandle(h)).toBe(true)
  })
  it('rejects everything else', () => {
    for (const h of ['', 'x1234567890abcde', 'a b', 'a-b', '@bar', 'bar/../x', 'bar%20', 'ｂａｒ', null, undefined, 42]) {
      expect(isValidHandle(h)).toBe(false)
    }
  })
})

describe('parseTwitterHandle / allowedHandles', () => {
  it('extracts handles from twitter.com and x.com URLs', () => {
    expect(parseTwitterHandle('https://twitter.com/BarAlbatross')).toBe('BarAlbatross')
    expect(parseTwitterHandle('https://x.com/some_bar?lang=ja')).toBe('some_bar')
    expect(parseTwitterHandle('x.com/abc')).toBe('abc')
  })
  it('ignores non-profile paths and other sites', () => {
    expect(parseTwitterHandle('https://twitter.com/intent/tweet')).toBeNull()
    expect(parseTwitterHandle('https://instagram.com/bar')).toBeNull()
    expect(parseTwitterHandle('')).toBeNull()
    expect(parseTwitterHandle(null)).toBeNull()
  })
  it('builds a lower-cased allow-list and drops invalid entries', () => {
    const set = allowedHandles([
      'https://twitter.com/BarAlbatross', 'https://instagram.com/x', null,
      'https://x.com/this_handle_is_far_too_long',
    ])
    expect([...set]).toEqual(['baralbatross'])
    expect(set.has('randomperson')).toBe(false)
  })
})

describe('createSingleFlight', () => {
  it('shares one call between concurrent callers of the same key', async () => {
    const flight = createSingleFlight()
    const gate = deferred()
    let calls = 0
    const fn = async () => { calls++; return gate.promise }
    const all = Array.from({ length: 10 }, () => flight('feed', fn))
    expect(flight.pending()).toBe(1)
    gate.resolve('payload')
    expect(await Promise.all(all)).toEqual(Array(10).fill('payload'))
    expect(calls).toBe(1)
    expect(flight.pending()).toBe(0)
  })

  it('different keys do not share', async () => {
    const flight = createSingleFlight()
    let calls = 0
    await Promise.all([flight('a', async () => ++calls), flight('b', async () => ++calls)])
    expect(calls).toBe(2)
  })

  it('runs again after the first flight settled, also after a failure', async () => {
    const flight = createSingleFlight()
    let calls = 0
    await expect(flight('k', async () => { calls++; throw new Error('boom') })).rejects.toThrow('boom')
    expect(flight.pending()).toBe(0)
    expect(await flight('k', async () => { calls++; return 'ok' })).toBe('ok')
    expect(calls).toBe(2)
  })

  it('a synchronous throw becomes a rejection and is cleaned up', async () => {
    const flight = createSingleFlight()
    await expect(flight('k', () => { throw new Error('sync') })).rejects.toThrow('sync')
    expect(flight.pending()).toBe(0)
  })
})

describe('createCachedFetcher', () => {
  // A tiny cache with expiry, standing in for the Postgres `cache` table.
  function makeCache() {
    const rows = new Map() // key -> { data, fresh }
    return {
      rows,
      readCache: async (key, { allowStale }) => {
        const row = rows.get(key)
        if (!row || (!row.fresh && !allowStale)) return null
        return row.data
      },
    }
  }

  it('returns a fresh entry without calling upstream', async () => {
    const cache = makeCache()
    cache.rows.set('feed', { data: { tweets: [1] }, fresh: true })
    const getCached = createCachedFetcher(cache)
    let calls = 0
    expect(await getCached('feed', async () => { calls++ })).toEqual({ tweets: [1] })
    expect(calls).toBe(0)
  })

  it('10 concurrent cold requests cause one upstream call', async () => {
    const cache = makeCache()
    const getCached = createCachedFetcher(cache)
    const gate = deferred()
    let calls = 0
    const produce = async () => {
      calls++
      const data = await gate.promise
      cache.rows.set('feed', { data, fresh: true })
      return data
    }
    const all = Array.from({ length: 10 }, () => getCached('feed', produce))
    await new Promise(r => setTimeout(r, 5))
    gate.resolve({ tweets: ['t'] })
    const results = await Promise.all(all)
    expect(calls).toBe(1)
    for (const r of results) expect(r).toEqual({ tweets: ['t'] })
    // and the next request is served from the cache
    await getCached('feed', produce)
    expect(calls).toBe(1)
  })

  it('serves the expired entry with stale: true when upstream fails', async () => {
    const cache = makeCache()
    cache.rows.set('feed', { data: { tweets: ['old'] }, fresh: false })
    const errors = []
    const getCached = createCachedFetcher({ ...cache, onError: (err, key) => errors.push([key, err.message]) })
    const result = await getCached('feed', async () => { throw new Error('Twitter API 503') })
    expect(result).toEqual({ tweets: ['old'], stale: true })
    expect(errors).toEqual([['feed', 'Twitter API 503']])
    // the stored entry itself is not modified
    expect(cache.rows.get('feed').data).toEqual({ tweets: ['old'] })
  })

  it('propagates the error when there is nothing cached at all', async () => {
    const getCached = createCachedFetcher(makeCache())
    await expect(getCached('feed', async () => { throw new Error('down') })).rejects.toThrow('down')
  })

  it('force skips the fresh cache but still joins a running flight', async () => {
    const cache = makeCache()
    cache.rows.set('feed', { data: { tweets: ['cached'] }, fresh: true })
    const getCached = createCachedFetcher(cache)
    const gate = deferred()
    let calls = 0
    const produce = async () => { calls++; return gate.promise }
    const a = getCached('feed', produce, { force: true })
    const b = getCached('feed', produce, { force: true })
    gate.resolve({ tweets: ['new'] })
    expect(await a).toEqual({ tweets: ['new'] })
    expect(await b).toEqual({ tweets: ['new'] })
    expect(calls).toBe(1)
  })
})

describe('parseTwitterHandle host anchoring', () => {
  it('only accepts twitter.com / x.com profile URLs', async () => {
    const { parseTwitterHandle } = await import('../server/lib/feedCore.js')
    expect(parseTwitterHandle('https://x.com/goldensport248?t=abc&s=09')).toBe('goldensport248')
    expect(parseTwitterHandle('twitter.com/@some_bar')).toBe('some_bar')
    expect(parseTwitterHandle(' https://mobile.twitter.com/some_bar ')).toBe('some_bar')
    expect(parseTwitterHandle('https://netflix.com/foo')).toBeNull()
    expect(parseTwitterHandle('https://www.google.com/url?q=https://x.com/foo')).toBeNull()
    expect(parseTwitterHandle('https://www.instagram.com/x.com/foo')).toBeNull()
  })
})
