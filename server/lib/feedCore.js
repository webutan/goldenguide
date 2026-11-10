// Pure feed helpers (no database, no network) so they can be unit-tested.

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/

/** True for a syntactically valid Twitter/X handle (no @, 1-15 chars). */
export function isValidHandle(handle) {
  return typeof handle === 'string' && HANDLE_RE.test(handle)
}

/** Extract the account handle from a twitter.com / x.com profile URL. */
export function parseTwitterHandle(url) {
  if (!url) return null
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i)
  if (!match) return null
  const skip = ['intent', 'search', 'hashtag', 'i', 'share']
  if (skip.includes(match[1].toLowerCase())) return null
  return match[1]
}

/**
 * Lower-cased set of the handles found in a list of `sns` URLs. Only handles
 * in this set may be fetched from the paid API.
 */
export function allowedHandles(snsUrls) {
  const set = new Set()
  for (const url of snsUrls) {
    const handle = parseTwitterHandle(url)
    if (handle && isValidHandle(handle)) set.add(handle.toLowerCase())
  }
  return set
}

/**
 * Single-flight: concurrent calls with the same key share one in-flight
 * promise, so a burst of cache misses causes one upstream fetch. The entry is
 * removed when the promise settles (success or failure).
 */
export function createSingleFlight() {
  const inFlight = new Map()
  function run(key, fn) {
    const existing = inFlight.get(key)
    if (existing) return existing
    const promise = (async () => fn())().finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key)
    })
    inFlight.set(key, promise)
    return promise
  }
  run.pending = () => inFlight.size
  return run
}

/**
 * Cache-or-fetch with single-flight and stale fallback.
 *
 *   readCache(key, { allowStale }) -> cached value or null
 *   produce()                      -> fetches upstream AND writes the cache
 *
 * - a fresh cache entry is returned as is;
 * - on a miss, concurrent callers share one `produce()`;
 * - if `produce()` throws and any (expired) entry exists, that entry is
 *   returned with `stale: true`; with no entry at all the error propagates;
 * - `{ force: true }` skips the fresh-cache check (scheduled refresh) but
 *   still joins a flight that is already running for the key.
 */
export function createCachedFetcher({ readCache, singleFlight = createSingleFlight(), onError = () => {} }) {
  return async function getCached(key, produce, { force = false } = {}) {
    if (!force) {
      const fresh = await readCache(key, { allowStale: false })
      if (fresh) return fresh
    }
    return singleFlight(key, async () => {
      if (!force) {
        // Re-check: another flight may have filled the cache while we awaited.
        const again = await readCache(key, { allowStale: false })
        if (again) return again
      }
      try {
        return await produce()
      } catch (err) {
        onError(err, key)
        const stale = await readCache(key, { allowStale: true })
        if (stale) return { ...stale, stale: true }
        throw err
      }
    })
  }
}
