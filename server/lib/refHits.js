// Counting arrivals from printed material (G05): a door sticker's QR code
// points at /bar/<slug>?ref=sticker, and the SEO route (routes/seo.js), which
// serves every /bar/<slug> navigation, counts those requests per bar per day.
//
// What is stored: (ref, bar_id, day, hits). No IP, no user agent, no cookie.
// The top half is pure and unit-tested in tests/serverRefHits.test.js.

/** The only `ref` values that are counted. Anything else is ignored. */
export const COUNTED_REFS = Object.freeze(['sticker'])

/** `?ref=` value -> a counted ref, or null. Repeated params (arrays) are refused. */
export function normalizeRef(value) {
  return typeof value === 'string' && COUNTED_REFS.includes(value) ? value : null
}

// Link-preview fetchers, search crawlers and scripted clients. Kept short on
// purpose: a courtesy filter for the obvious cases, not bot detection.
// - Every browser's user agent starts with "Mozilla/"; curl, Twitterbot,
//   WhatsApp, facebookexternalhit and HTTP libraries do not.
// - Of those that do claim Mozilla: "bot" as Googlebot / bingbot / AhrefsBot
//   write it (so a phone whose model name is in capitals, CUBOT, still
//   counts), and a few other words crawlers and headless browsers use.
const BROWSER_RE = /^Mozilla\//
const BOT_RE = /[Bb]ot\b/
const AGENT_RE = /crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i

/** True for an obvious non-human client. A missing user agent counts as one. */
export function isBotUserAgent(userAgent) {
  if (typeof userAgent !== 'string' || !BROWSER_RE.test(userAgent)) return true
  return BOT_RE.test(userAgent) || AGENT_RE.test(userAgent)
}

// Browsers that fetch a page ahead of a visit say so.
function isPrefetch(headers) {
  const purpose = `${headers['sec-purpose'] || ''} ${headers.purpose || ''} ${headers['x-moz'] || ''}`
  return /prefetch|prerender/i.test(purpose)
}

/**
 * The ref to count for a request, or null.
 * @param {{ method?: string, query?: object, headers?: object }} req
 */
export function countedRef(req) {
  if (!req || req.method !== 'GET') return null
  const ref = normalizeRef(req.query && req.query.ref)
  if (!ref) return null
  const headers = req.headers || {}
  if (isBotUserAgent(headers['user-agent']) || isPrefetch(headers)) return null
  return ref
}

// ── Database ──────────────────────────────────────────────────────────────────

// A day is a Tokyo calendar day: that is where the stickers and the bars are.
const TODAY = "(now() AT TIME ZONE 'Asia/Tokyo')::date"

/** Add one hit for (ref, bar, today). Rejects on a database error. */
export function recordRefHit(db, ref, barId) {
  return db.query(
    `INSERT INTO ref_hits (ref, bar_id, day, hits) VALUES ($1, $2, ${TODAY}, 1)
     ON CONFLICT (ref, bar_id, day) DO UPDATE SET hits = ref_hits.hits + 1`,
    [ref, barId]
  )
}

/**
 * Per-bar totals for one ref: [{ bar_id, recent, total, last_day }], where
 * `recent` covers the last `days` Tokyo days including today.
 */
export async function refStats(db, ref, days = 30) {
  const { rows } = await db.query(
    `SELECT bar_id,
            COALESCE(SUM(hits) FILTER (WHERE day > ${TODAY} - $2::int), 0)::int AS recent,
            SUM(hits)::int AS total,
            to_char(MAX(day), 'YYYY-MM-DD') AS last_day
       FROM ref_hits
      WHERE ref = $1
      GROUP BY bar_id
      ORDER BY bar_id`,
    [ref, days]
  )
  return rows
}
