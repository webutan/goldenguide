// "Try again in about N minutes" for rate-limited requests (HTTP 429, the
// admin lockout, chat). The wait comes from the response's Retry-After header
// or, for chat, from the socket event; when it is unknown the message just
// says "later".

/**
 * Seconds to wait from a Retry-After header value: either delta-seconds
 * ("540") or an HTTP date. Null when missing or unreadable.
 */
export function parseRetryAfter(value, now = Date.now()) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return Number(text)
  // An HTTP date has names in it ("Thu, 01 Jan ..."); Date.parse alone would
  // also accept stray numbers such as "-5".
  if (!/[a-z]/i.test(text)) return null
  const date = Date.parse(text)
  if (Number.isNaN(date)) return null
  return Math.max(0, Math.ceil((date - now) / 1000))
}

/** Seconds to wait according to a fetch Response, or null. */
export function retryAfterOf(res) {
  return parseRetryAfter(res?.headers?.get?.('Retry-After'))
}

/**
 * The localized notice. `seconds` is the wait (null/undefined = unknown);
 * it is rounded up to whole minutes, and under a minute reads "in a moment".
 * `key` is the sentence the retry text goes into: 'rateLimited' or
 * 'adminLockedOut' (both take a {retry} placeholder).
 */
export function rateLimitMessage(t, seconds, key = 'rateLimited') {
  let retry
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    retry = t('retryLater')
  } else if (seconds < 60) {
    retry = t('retryMoment')
  } else {
    const n = Math.ceil(seconds / 60)
    retry = n === 1 ? t('retryMinute') : t('retryMinutes', { n })
  }
  return t(key, { retry })
}
