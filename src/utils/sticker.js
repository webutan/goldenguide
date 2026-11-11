// Door stickers (G05): pure helpers for the admin sticker sheet.
// No DOM, no Vue; unit-tested in tests/sticker.test.js.

/** `?ref=` value the API counts for sticker scans (server/lib/refHits.js). */
export const STICKER_REF = 'sticker'

/** Stickers on one A4 page (2 columns x 4 rows of 90 x 55 mm). */
export const STICKERS_PER_PAGE = 8

/** Blank modules around a QR code. The standard asks for at least 4. */
export const QR_QUIET_ZONE = 4

/**
 * The site address a sticker points at, from what the admin typed.
 * Accepts an http(s) URL with an optional path (a site served under a
 * sub-path); query and fragment are dropped, as are trailing slashes.
 * Returns null when it is not usable.
 */
export function normalizeBaseUrl(input) {
  const text = String(input ?? '').trim()
  if (!/^https?:\/\//i.test(text)) return null
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (!url.hostname || url.username || url.password) return null
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

/**
 * What the QR code says: the bar's deep link, marked as a sticker scan.
 * The slug may be Japanese and is percent-encoded, so the payload is ASCII.
 * No ?lang: the visitor's own language applies.
 */
export function stickerUrl(base, slug) {
  return `${String(base || '').replace(/\/+$/, '')}/bar/${encodeURIComponent(String(slug))}?ref=${STICKER_REF}`
}

/**
 * True for an address that only works on this machine or network (localhost,
 * a private IP, a .local name): a sticker printed with it is useless outside.
 */
export function isLocalBaseUrl(base) {
  let host
  try {
    host = new URL(base).hostname.toLowerCase()
  } catch {
    return false
  }
  if (host.startsWith('[')) return host === '[::1]' || /^\[f[cde]/.test(host) // IPv6 loopback, unique-local, link-local
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host)
  if (!m) return !host.includes('.') // a bare machine name
  const a = Number(m[1])
  const b = Number(m[2])
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)
}

/** Street id -> label for the filter: "hanazono-1" -> "Hanazono 1". */
export function streetName(id) {
  return String(id || '').split(/[-_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

/** Host shown in small print on the sticker ("goldengai.example"). */
export function displayHost(base) {
  try {
    return new URL(base).host
  } catch {
    return ''
  }
}

/** Split a list into pages of `size`. An empty list has no pages. */
export function paginate(list, size = STICKERS_PER_PAGE) {
  const pages = []
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size))
  return pages
}

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

/**
 * The two name lines of a sticker: English first when there is one, Japanese
 * below. A bar with a single name (or the same one twice) has one line.
 * `jp` says whether the line is the Japanese name (it picks the font size).
 */
export function stickerNames(bar) {
  const en = clean(bar && bar.name_en)
  const jp = clean(bar && bar.name_jp)
  if (en && jp && en.toLowerCase() !== jp.toLowerCase()) {
    return { primary: en, secondary: jp }
  }
  return { primary: en || jp, secondary: '' }
}

// Full-width characters take about twice the room of Latin ones.
function visualLength(text) {
  let n = 0
  for (const ch of String(text)) n += ch.codePointAt(0) > 0x2E7F ? 2 : 1
  return n
}

/** Size step for a name line so long names still fit: 'l' | 'm' | 's'. */
export function nameSize(text) {
  const n = visualLength(text)
  if (n <= 12) return 'l'
  if (n <= 22) return 'm'
  return 's'
}

/**
 * SVG path data for a QR matrix, one unit per module, offset by the quiet zone.
 * Dark modules in a row are merged into runs so the path stays small and
 * there are no hairline seams between neighbours.
 * @param {number} size   modules per side
 * @param {(row: number, col: number) => boolean} isDark
 */
export function qrPath(size, isDark, margin = QR_QUIET_ZONE) {
  let d = ''
  for (let row = 0; row < size; row++) {
    let start = -1
    for (let col = 0; col <= size; col++) {
      const dark = col < size && isDark(row, col)
      if (dark && start < 0) start = col
      if (!dark && start >= 0) {
        d += `M${start + margin} ${row + margin}h${col - start}v1h-${col - start}z`
        start = -1
      }
    }
  }
  return d
}

/** Side of the whole symbol in modules, quiet zone included. */
export function qrViewSize(size, margin = QR_QUIET_ZONE) {
  return size + margin * 2
}
