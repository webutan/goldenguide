// Pure rate-limit helpers (no Express, no database) so they can be unit-tested.

/**
 * The key every HTTP limiter uses: Express's `req.ip`. With `trust proxy = 1`
 * that is the single address nginx forwards (nginx resolves the real visitor
 * with its realip module). Never read X-Forwarded-For here: its first entry
 * is whatever the client sent.
 */
export function ipKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

/**
 * Client address of a Socket.io handshake: the `x-real-ip` header nginx sets,
 * else the socket's peer address. X-Forwarded-For is deliberately ignored
 * (the client controls its first entry).
 */
export function socketIpKey(handshake) {
  const real = handshake?.headers?.['x-real-ip']
  const value = Array.isArray(real) ? real[0] : real
  if (typeof value === 'string' && value.trim()) return value.trim()
  return handshake?.address || 'unknown'
}

/**
 * In-memory sliding-window limiter keyed by string (an IP).
 *
 * `rules` is a list of `{ windowMs, max }`; a hit is allowed only if every
 * rule still has room. Rejected hits are not recorded, so a blocked key
 * recovers as soon as its old hits age out.
 *
 * Memory is bounded: each key keeps at most `max(rule.max)` timestamps, and
 * keys with no hit inside the longest window are dropped by `prune()`, which
 * runs by itself at most once per `pruneIntervalMs` whenever the limiter is
 * used.
 */
export function createKeyedLimiter({ rules, now = Date.now, pruneIntervalMs = 60 * 1000 }) {
  if (!Array.isArray(rules) || rules.length === 0) throw new Error('rules required')
  const longest = Math.max(...rules.map(r => r.windowMs))
  const hits = new Map() // key -> ascending timestamps, all within `longest`
  let lastPrune = now()

  function prune(t = now()) {
    lastPrune = t
    for (const [key, list] of hits) {
      if (list.length === 0 || t - list[list.length - 1] >= longest) hits.delete(key)
    }
  }

  function maybePrune(t) {
    if (t - lastPrune >= pruneIntervalMs) prune(t)
  }

  // Timestamps for `key` that are still inside the longest window.
  function live(key, t) {
    const list = hits.get(key)
    if (!list) return null
    let drop = 0
    while (drop < list.length && t - list[drop] >= longest) drop++
    if (drop) list.splice(0, drop)
    if (list.length === 0) { hits.delete(key); return null }
    return list
  }

  // ms until `key` may hit again (0 = allowed now).
  function retryAfterAt(key, t) {
    const list = live(key, t)
    if (!list) return 0
    let wait = 0
    for (const { windowMs, max } of rules) {
      let count = 0
      for (let i = list.length - 1; i >= 0 && t - list[i] < windowMs; i--) count++
      if (count >= max) {
        // Allowed again once the max-th newest hit leaves this window.
        const blocker = list[list.length - max]
        wait = Math.max(wait, blocker + windowMs - t)
      }
    }
    return wait
  }

  /** True if `key` is currently over a limit. Does not record anything. */
  function isBlocked(key) {
    const t = now()
    maybePrune(t)
    return retryAfterAt(key, t) > 0
  }

  /** Record a hit if allowed. Returns true if it was allowed. */
  function hit(key) {
    const t = now()
    maybePrune(t)
    if (retryAfterAt(key, t) > 0) return false
    const list = hits.get(key)
    if (list) list.push(t)
    else hits.set(key, [t])
    return true
  }

  return {
    hit,
    isBlocked,
    retryAfterMs: key => retryAfterAt(key, now()),
    reset: key => { hits.delete(key) },
    prune: () => prune(now()),
    get size() { return hits.size },
  }
}
