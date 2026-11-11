// Pure helpers for link previews and SEO (G02): per-page <head> tags, JSON-LD,
// sitemap.xml and robots.txt. No Express, no DB, no network: everything here
// is unit-tested in tests/serverSeo.test.js. The route is routes/seo.js.
//
// Everything that ends up in the page comes from admin-edited bar data, and
// is still treated as hostile: text goes through escapeHtml(), JSON-LD through
// serializeJsonLd(), sitemap values through escapeXml().

export const SITE_NAME = 'Golden Gai Map'
export const DEFAULT_OG_IMAGE = { path: '/og/default.png', width: 1200, height: 630, type: 'image/png' }
// Marker the SPA reads to show its "not found" dialog (a <meta>, so it works
// under a strict Content-Security-Policy).
export const STATUS_META_NAME = 'golden-gai-status'
export const STATUS_NOT_FOUND = 'not-found'

const MAX_DESCRIPTION = 200

// The app says `jp`; HTML, hreflang and Open Graph say `ja`.
const LANGS = {
  en: { html: 'en', og: 'en_US' },
  jp: { html: 'ja', og: 'ja_JP' },
}

const TEXT = {
  en: {
    homeTitle: 'Golden Gai Map — every bar in Shinjuku Golden Gai',
    homeDescription: 'Interactive map and directory of the tiny bars of Golden Gai, Shinjuku, Tokyo: cover charges, opening hours, seats, photos and house rules, in English and Japanese.',
    mapTitle: `Map — ${SITE_NAME}`,
    directoryTitle: `Bar directory — ${SITE_NAME}`,
    notFoundTitle: `Bar not found — ${SITE_NAME}`,
    notFoundDescription: 'This bar is not on the map. It may have closed, or the link may be wrong.',
    area: 'Golden Gai, Shinjuku',
    charge: (yen) => `Charge ${yen}`,
    noCharge: 'No cover charge',
    seats: (n) => (n === 1 ? '1 seat' : `${n} seats`),
    floor: (n) => (n < 0 ? `B${-n}F` : `${n}F`),
  },
  jp: {
    homeTitle: '新宿ゴールデン街マップ — Golden Gai Map',
    homeDescription: '新宿ゴールデン街のバーを地図と一覧で探せるガイド。チャージ、営業時間、席数、写真、街のルールを日本語と英語で掲載。',
    mapTitle: `マップ — ${SITE_NAME}`,
    directoryTitle: `店舗一覧 — ${SITE_NAME}`,
    notFoundTitle: `お店が見つかりません — ${SITE_NAME}`,
    notFoundDescription: 'このお店はマップにありません。閉店したか、リンクが間違っている可能性があります。',
    area: '新宿ゴールデン街',
    charge: (yen) => `チャージ ${yen}`,
    noCharge: 'チャージなし',
    seats: (n) => `${n}席`,
    floor: (n) => (n < 0 ? `地下${-n}階` : `${n}階`),
  },
}

const STREETS = {
  'hanazono-1': { en: 'Hanazono 1', jp: '花園一番街' },
  'hanazono-3': { en: 'Hanazono 3', jp: '花園三番街' },
  'hanazono-5': { en: 'Hanazono 5', jp: '花園五番街' },
  'hanazono-8': { en: 'Hanazono 8', jp: '花園八番街' },
  'maneki-dori': { en: 'Maneki-dori', jp: 'まねき通り' },
}

// ── Escaping ──────────────────────────────────────────────────────────────────

const str = (value) => (value === null || value === undefined ? '' : String(value))

/** Escape text for HTML element content and for quoted attribute values. */
export function escapeHtml(value) {
  return str(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Characters XML 1.0 does not allow at all (they cannot even be escaped).
const XML_INVALID = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu

export function escapeXml(value) {
  return str(value)
    .replace(XML_INVALID, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * JSON for a <script type="application/ld+json"> block. `<`, `>` and `&` are
 * written as \uXXXX escapes so no value can spell `</script>` or `<!--`, and
 * U+2028/2029 are escaped too. The result is still plain JSON.
 */
export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** One line of text: control characters and runs of whitespace become a space. */
export function cleanText(value) {
  // eslint-disable-next-line no-control-regex
  return str(value).replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Cut to at most `max` characters (code points), ending in an ellipsis. */
export function truncate(value, max = MAX_DESCRIPTION) {
  const chars = Array.from(str(value))
  if (chars.length <= max) return chars.join('')
  return `${chars.slice(0, max - 1).join('').trimEnd()}…`
}

// ── Language, origin, URLs ────────────────────────────────────────────────────

/** `?lang=` value -> the app's language code. Anything else is English. */
export function seoLang(value) {
  return value === 'jp' || value === 'ja' ? 'jp' : 'en'
}

const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?))*(?::\d{1,5})?$/i

/**
 * Origin for absolute URLs: PUBLIC_URL when it is a valid http(s) origin,
 * else built from the request's protocol and Host header. A Host header that
 * does not look like a host name is refused ('' -> URLs stay path-only).
 */
export function resolveOrigin({ publicUrl, protocol, host } = {}) {
  const fixed = str(publicUrl).trim().replace(/\/+$/, '')
  if (fixed && ORIGIN_RE.test(fixed)) return fixed
  const name = str(host).trim()
  if (!name || name.length > 255 || !HOST_RE.test(name)) return ''
  return `${protocol === 'https' ? 'https' : 'http'}://${name.toLowerCase()}`
}

/** Path of a bar's page; the slug (possibly Japanese) is percent-encoded. */
export function barPath(slug) {
  return `/bar/${encodeURIComponent(str(slug))}`
}

const withLang = (path, lang) => (lang === 'jp' ? `${path}?lang=jp` : path)

/** `/uploads/...` path of a stored photo, or null if the filename is unsafe. */
export function photoPath(filename) {
  const parts = str(filename).split('/')
  if (!parts.length || parts.some(p => !p || p === '.' || p === '..' || /[\\\u0000-\u001F]/.test(p))) return null
  return `/uploads/${parts.map(encodeURIComponent).join('/')}`
}

// ── Bar text ──────────────────────────────────────────────────────────────────

export function barName(bar, lang = 'en') {
  const en = cleanText(bar && bar.name_en)
  const jp = cleanText(bar && bar.name_jp)
  return (lang === 'jp' ? jp || en : en || jp) || SITE_NAME
}

export function streetLabel(street, lang = 'en') {
  const id = cleanText(street)
  if (!id) return ''
  const known = STREETS[id.toLowerCase()]
  if (known) return known[lang] || known.en
  // Unknown id: "g2-dori" -> "G2 Dori"
  return id.split(/[-_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function chargeLabel(charge, lang) {
  const t = TEXT[lang]
  const text = cleanText(charge)
  if (!text) return ''
  if (/^\d{1,7}$/.test(text)) {
    const yen = Number(text)
    return yen === 0 ? t.noCharge : t.charge(`¥${yen.toLocaleString('en-US')}`)
  }
  return text.length <= 40 ? t.charge(text) : ''
}

/** "Charge ¥800 · 8 seats · Hanazono 3, 2F · Golden Gai, Shinjuku" */
export function fallbackDescription(bar, lang = 'en') {
  const t = TEXT[lang]
  const parts = []
  const charge = chargeLabel(bar.charge, lang)
  if (charge) parts.push(charge)
  const seats = Number(bar.seats)
  if (Number.isInteger(seats) && seats > 0 && seats < 1000) parts.push(t.seats(seats))
  const street = streetLabel(bar.street, lang)
  const floor = Number(bar.floor)
  const floorText = Number.isInteger(floor) && floor !== 0 && Math.abs(floor) < 20 ? t.floor(floor) : ''
  if (street) {
    const upstairs = floorText && floor !== 1
    parts.push(upstairs ? (lang === 'jp' ? `${street} ${floorText}` : `${street}, ${floorText}`) : street)
  }
  parts.push(t.area)
  return parts.join(' · ')
}

/** The bar's own description (one line, truncated), else the fallback line. */
export function barDescription(bar, lang = 'en') {
  const own = cleanText(bar && bar.description)
  return own ? truncate(own) : truncate(fallbackDescription(bar || {}, lang))
}

// ── Opening hours ─────────────────────────────────────────────────────────────

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_URLS = {
  mon: 'https://schema.org/Monday',
  tue: 'https://schema.org/Tuesday',
  wed: 'https://schema.org/Wednesday',
  thu: 'https://schema.org/Thursday',
  fri: 'https://schema.org/Friday',
  sat: 'https://schema.org/Saturday',
  sun: 'https://schema.org/Sunday',
}

// "9:00" / "19:30" -> "09:00" / "19:30"; "24:00" -> "00:00"; else null
function normalizeTime(value) {
  const m = typeof value === 'string' ? /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value) : null
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null
  return `${String(h % 24).padStart(2, '0')}:${m[2]}`
}

/**
 * schema.org OpeningHoursSpecification list from the app's `schedule` JSON
 * (shape documented in src/utils/openNow.js):
 *   { default: { open, close }, overrides: { fri: { open, close } }, closedDays: ['mon'] }
 *
 * - A closed day gets no entry.
 * - Hours past midnight keep `closes` earlier than `opens` ("19:00"–"03:00"),
 *   which schema.org and Google read as closing the next day.
 * - open === close means the whole day, as in openNow.js: 00:00–23:59.
 * - A day whose hours are missing or malformed is left out (unknown, not closed).
 * - Days with the same hours share one entry.
 * Returns [] when nothing is known.
 */
export function openingHoursSpecification(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return []
  const closed = new Set(Array.isArray(schedule.closedDays) ? schedule.closedDays.map(d => str(d).toLowerCase()) : [])
  const overrides = schedule.overrides && typeof schedule.overrides === 'object' ? schedule.overrides : {}
  const groups = new Map()
  for (const day of DAY_KEYS) {
    if (closed.has(day)) continue
    const hours = overrides[day] || schedule.default
    let opens = normalizeTime(hours && hours.open)
    let closes = normalizeTime(hours && hours.close)
    if (opens === null || closes === null) continue
    if (opens === closes) {
      opens = '00:00'
      closes = '23:59'
    }
    const key = `${opens}-${closes}`
    if (!groups.has(key)) groups.set(key, { opens, closes, days: [] })
    groups.get(key).days.push(DAY_URLS[day])
  }
  return [...groups.values()].map(({ opens, closes, days }) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: days,
    opens,
    closes,
  }))
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** schema.org BarOrPub for one bar. `url` and `image` are absolute URLs. */
export function buildBarJsonLd(bar, { url, image, lang = 'en' } = {}) {
  const name = barName(bar, lang)
  const other = barName(bar, lang === 'jp' ? 'en' : 'jp')
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name,
    url,
  }
  if (other && other !== name) data.alternateName = other
  if (image) data.image = image
  const description = cleanText(bar.description)
  if (description) data.description = truncate(description, 500)

  const address = {
    '@type': 'PostalAddress',
    addressLocality: 'Shinjuku',
    addressRegion: 'Tokyo',
    addressCountry: 'JP',
  }
  const street = cleanText(bar.address)
  if (street) address.streetAddress = street
  data.address = address

  const lat = finiteNumber(bar.lat)
  const lng = finiteNumber(bar.lng)
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    data.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
  }

  const hours = openingHoursSpecification(bar.schedule)
  if (hours.length) data.openingHoursSpecification = hours

  const phone = cleanText(bar.phone)
  if (phone) data.telephone = phone
  return data
}

// ── <head> ────────────────────────────────────────────────────────────────────

const meta = (attr, key, content) => `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`
const link = (rel, href, extra = '') => `<link rel="${rel}"${extra} href="${escapeHtml(href)}" />`

/**
 * Tags for one page.
 * @param {object} page
 * @param {'home'|'map'|'directory'|'bar'|'notFound'} page.kind
 * @param {'en'|'jp'} [page.lang]
 * @param {string} [page.origin]   e.g. "https://example.com" ('' -> path-only URLs)
 * @param {object} [page.bar]      for kind 'bar'
 * @param {string|null} [page.photo]  `/uploads/...` path of the bar's photo, if it has one
 * @param {boolean} [page.noindex]
 * @returns {{ htmlLang: string, title: string, tags: string[] }}
 */
export function buildHead(page) {
  const lang = page.lang === 'jp' ? 'jp' : 'en'
  const t = TEXT[lang]
  const origin = str(page.origin)
  const abs = (path) => `${origin}${path}`

  let path = '/'
  let title = t.homeTitle
  let description = t.homeDescription
  let image = { ...DEFAULT_OG_IMAGE }
  let imageAlt = SITE_NAME
  let jsonLd = null
  const notFound = page.kind === 'notFound'

  if (page.kind === 'bar' && page.bar) {
    const name = barName(page.bar, lang)
    path = barPath(page.bar.slug)
    title = `${name} — ${SITE_NAME}`
    description = barDescription(page.bar, lang)
    imageAlt = name
    if (page.photo) image = { path: page.photo }
    jsonLd = buildBarJsonLd(page.bar, { url: abs(withLang(path, lang)), image: abs(image.path), lang })
  } else if (page.kind === 'map') {
    path = '/map'
    title = t.mapTitle
  } else if (page.kind === 'directory') {
    path = '/directory'
    title = t.directoryTitle
  } else if (notFound) {
    title = t.notFoundTitle
    description = t.notFoundDescription
  } else {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: abs('/'),
      inLanguage: ['en', 'ja'],
    }
  }

  const url = abs(withLang(path, lang))
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
  ]
  if (notFound) {
    tags.push(meta('name', 'robots', 'noindex'))
    tags.push(meta('name', STATUS_META_NAME, STATUS_NOT_FOUND))
  } else {
    if (page.noindex) tags.push(meta('name', 'robots', 'noindex'))
    tags.push(link('canonical', url))
    tags.push(link('alternate', abs(path), ' hreflang="en"'))
    tags.push(link('alternate', abs(withLang(path, 'jp')), ' hreflang="ja"'))
    tags.push(link('alternate', abs(path), ' hreflang="x-default"'))
  }
  tags.push(meta('property', 'og:site_name', SITE_NAME))
  tags.push(meta('property', 'og:type', 'website'))
  tags.push(meta('property', 'og:title', title))
  tags.push(meta('property', 'og:description', description))
  if (!notFound) tags.push(meta('property', 'og:url', url))
  tags.push(meta('property', 'og:locale', LANGS[lang].og))
  tags.push(meta('property', 'og:locale:alternate', LANGS[lang === 'jp' ? 'en' : 'jp'].og))
  tags.push(meta('property', 'og:image', abs(image.path)))
  if (image.width) {
    tags.push(meta('property', 'og:image:type', image.type))
    tags.push(meta('property', 'og:image:width', image.width))
    tags.push(meta('property', 'og:image:height', image.height))
  }
  tags.push(meta('property', 'og:image:alt', imageAlt))
  tags.push(meta('name', 'twitter:card', 'summary_large_image'))
  tags.push(meta('name', 'twitter:title', title))
  tags.push(meta('name', 'twitter:description', description))
  tags.push(meta('name', 'twitter:image', abs(image.path)))
  if (jsonLd) tags.push(`<script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`)

  return { htmlLang: LANGS[lang].html, title, tags }
}

// Tags this module owns. Whatever index.html ships as defaults is removed
// before the per-page set goes in, so nothing is ever duplicated.
const MANAGED_META = /[ \t]*<meta\s[^>]*\b(?:name|property)\s*=\s*["'](?:description|robots|golden-gai-status|og:[^"']*|twitter:[^"']*)["'][^>]*>[ \t]*\r?\n?/gi
const MANAGED_LINK = /[ \t]*<link\s[^>]*\brel\s*=\s*["'](?:canonical|alternate)["'][^>]*>[ \t]*\r?\n?/gi
const MANAGED_JSONLD = /[ \t]*<script\s[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi
const TITLE = /([ \t]*)<title[^>]*>[\s\S]*?<\/title>[ \t]*\r?\n?/i
const SLOT = '\u0000seo-slot\u0000'

/** True if `html` looks like the built SPA shell (so it is safe to cache and serve). */
export function isSpaTemplate(html) {
  return typeof html === 'string' && html.length < 512 * 1024
    && /<\/head>/i.test(html) && /<div id="app"/i.test(html)
}

/**
 * Put a page's tags into the SPA's index.html: sets <html lang>, replaces
 * <title> and every managed default tag. The rest of the document (scripts,
 * stylesheets, body) is untouched.
 */
export function injectHead(template, { htmlLang, tags }) {
  let html = str(template).split(SLOT).join('')
  html = html
    .replace(MANAGED_META, '')
    .replace(MANAGED_JSONLD, '')
    .replace(MANAGED_LINK, (tag) => (/\bhreflang\b/i.test(tag) || /canonical/i.test(tag) ? '' : tag))

  let indent = '    '
  if (TITLE.test(html)) {
    html = html.replace(TITLE, (m, lead) => { indent = lead; return SLOT })
  } else {
    html = html.replace(/([ \t]*)<\/head>/i, (m) => `${SLOT}${m}`)
  }
  const block = tags.map(tag => `${indent}${tag}\n`).join('')
  html = html.split(SLOT).join(block)

  if (htmlLang) {
    html = html.replace(/<html\b([^>]*)>/i, (m, attrs) => {
      const rest = attrs.replace(/\s+lang\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '')
      return `<html lang="${escapeHtml(htmlLang)}"${rest}>`
    })
  }
  return html
}

/** Convenience: buildHead + injectHead. */
export function renderPage(template, page) {
  return injectHead(template, buildHead(page))
}

// ── sitemap.xml / robots.txt ──────────────────────────────────────────────────

function lastmod(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/**
 * @param {string} origin
 * @param {Array<{ slug: string, updated_at?: Date|string }>} bars  active bars only
 */
export function buildSitemapXml(origin, bars = []) {
  const urls = [{ path: '/' }, { path: '/map' }, { path: '/directory' }]
  for (const bar of bars) {
    if (!bar || !bar.slug) continue
    urls.push({ path: barPath(bar.slug), lastmod: lastmod(bar.updated_at) })
  }
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
  for (const u of urls) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(`${origin}${u.path}`)}</loc>`)
    if (u.lastmod) lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`)
    lines.push('  </url>')
  }
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

export function buildRobotsTxt(origin) {
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /api/', '']
  if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`, '')
  return lines.join('\n')
}

// ── Template cache ────────────────────────────────────────────────────────────

/**
 * Caches the SPA's index.html.
 * - fresh for `ttlMs`, then reloaded on the next request;
 * - a failed reload keeps the last good copy and is retried after `retryMs`;
 * - with no copy at all, get() rejects (the route answers 503 and nginx
 *   serves its own static index.html instead).
 * `load` resolves to the HTML text; concurrent callers share one load.
 */
export function createTemplateCache({ load, ttlMs = 5 * 60 * 1000, retryMs = 30 * 1000, now = Date.now, onError = () => {} }) {
  let html = null
  let checkAfter = 0
  let pending = null

  function refresh() {
    if (!pending) {
      pending = Promise.resolve()
        .then(load)
        .then((text) => {
          if (!isSpaTemplate(text)) throw new Error('response is not the SPA index.html')
          html = text
          checkAfter = now() + ttlMs
        })
        .catch((err) => {
          checkAfter = now() + retryMs
          onError(err)
          if (html === null) throw err
        })
        .finally(() => { pending = null })
    }
    return pending
  }

  return {
    async get() {
      if (html !== null && now() < checkAfter) return html
      if (html === null && now() < checkAfter) throw new Error('SPA template unavailable')
      await refresh()
      return html
    },
  }
}
