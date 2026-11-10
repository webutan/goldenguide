import rateLimit from 'express-rate-limit'
import { createKeyedLimiter, ipKey } from '../lib/rateLimitCore.js'

// ── Every limit lives here ──────────────────────────────────────────────────
const SECOND = 1000
const MINUTE = 60 * SECOND

// Wrong admin passwords per IP (correct ones are never counted).
export const ADMIN_AUTH_WINDOW_MS = 15 * MINUTE
export const ADMIN_AUTH_MAX_FAILURES = 20

// POST /api/reviews per IP.
export const REVIEW_WINDOW_MS = 10 * MINUTE
export const REVIEW_MAX = 5

// Generic public write endpoints (suggestions, guestbook, ...) per IP.
export const PUBLIC_WRITE_WINDOW_MS = 10 * MINUTE
export const PUBLIC_WRITE_MAX = 10

// GET /api/feed* per IP.
export const FEED_WINDOW_MS = 1 * MINUTE
export const FEED_MAX = 60

// SEO pages (/bar/<slug>, /sitemap.xml, /robots.txt, /, /map, /directory)
// per IP. Generous: a crawler walking the sitemap should never hit it, and a
// visitor who does still gets the app (nginx serves the static shell on 429).
export const SEO_WINDOW_MS = 1 * MINUTE
export const SEO_MAX = 300

// Chat (Socket.io) per IP.
export const CHAT_MESSAGE_MIN_INTERVAL_MS = 1 * SECOND
export const CHAT_MESSAGE_WINDOW_MS = 1 * MINUTE
export const CHAT_MESSAGE_MAX = 20
export const CHAT_CHECKIN_MIN_INTERVAL_MS = 5 * SECOND
// ────────────────────────────────────────────────────────────────────────────

export const RATE_LIMITED_BODY = { error: 'rate_limited' }

/** Send the shared 429 response. `retryAfterMs` adds a Retry-After header. */
export function sendRateLimited(res, retryAfterMs) {
  if (retryAfterMs > 0) res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
  return res.status(429).json(RATE_LIMITED_BODY)
}

/**
 * An express-rate-limit middleware keyed on `req.ip` that answers
 * `429 { error: 'rate_limited' }`. Each call has its own counters.
 */
export function createIpLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: ipKey,
    handler: (req, res) => { res.status(429).json(RATE_LIMITED_BODY) },
  })
}

export const reviewLimiter = createIpLimiter({ windowMs: REVIEW_WINDOW_MS, max: REVIEW_MAX })
export const publicWriteLimiter = createIpLimiter({ windowMs: PUBLIC_WRITE_WINDOW_MS, max: PUBLIC_WRITE_MAX })
export const feedLimiter = createIpLimiter({ windowMs: FEED_WINDOW_MS, max: FEED_MAX })
export const seoLimiter = createIpLimiter({ windowMs: SEO_WINDOW_MS, max: SEO_MAX })

/**
 * Failed admin logins per IP. Not an Express middleware: the `admin`
 * middleware (and the synchronous `isAdminRequest` helper) call
 * `isBlocked(ip)` before checking the password and `hit(ip)` only when the
 * password is wrong, so successful requests are never counted.
 */
export const adminAuthLimiter = createKeyedLimiter({
  rules: [{ windowMs: ADMIN_AUTH_WINDOW_MS, max: ADMIN_AUTH_MAX_FAILURES }],
})

/** Chat messages per IP: 1 per second and 20 per minute. */
export const chatMessageLimiter = createKeyedLimiter({
  rules: [
    { windowMs: CHAT_MESSAGE_MIN_INTERVAL_MS, max: 1 },
    { windowMs: CHAT_MESSAGE_WINDOW_MS, max: CHAT_MESSAGE_MAX },
  ],
})

/** Check-ins per IP: 1 per 5 seconds. */
export const chatCheckinLimiter = createKeyedLimiter({
  rules: [{ windowMs: CHAT_CHECKIN_MIN_INTERVAL_MS, max: 1 }],
})
