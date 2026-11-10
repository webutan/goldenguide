// Pure request-validation helpers shared by the bars, photos and partitions
// routes. No DB access here so they can be unit-tested directly.

// Bar columns an admin may set through POST /api/bars and PATCH /api/bars/:id.
export const BAR_FIELDS = [
  'name_jp', 'name_en', 'street', 'floor', 'building_id', 'map_x', 'map_y',
  'lat', 'lng', 'address', 'plus_code', 'google_link', 'charge', 'male_charge', 'drink_price', 'cash_only',
  'seats', 'phone', 'hours', 'closed_days', 'description', 'sns', 'other_links', 'is_active', 'schedule',
]

// JSONB columns: node-postgres would serialise a JS array as a Postgres array
// literal, so these are passed as JSON text instead.
const JSONB_BAR_FIELDS = new Set(['schedule', 'other_links'])

// Returns [[column, value], ...] for the allowed keys present in `body`,
// in BAR_FIELDS order, with JSONB values stringified.
export function pickBarFields(body) {
  if (!body || typeof body !== 'object') return []
  const out = []
  for (const key of BAR_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue
    let value = body[key]
    if (value === undefined) value = null
    if (JSONB_BAR_FIELDS.has(key) && value !== null) value = JSON.stringify(value)
    out.push([key, value])
  }
  return out
}

// Strictly parse a positive integer id ("12" ok; "12abc", "0", "-1", "1.5" not).
export function parsePositiveInt(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : null
}

// URL slug from a bar name. Keeps ASCII letters/digits and Japanese
// characters (full-width ASCII is folded to half-width first).
export function slugify(name) {
  if (typeof name !== 'string') return ''
  return name
    .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9぀-ヿ㐀-鿿ｦ-ﾟ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

// Tag ids for PATCH/POST: must be an array of non-empty strings (deduplicated).
// Returns null if invalid.
export function normalizeTagIds(tags) {
  if (!Array.isArray(tags)) return null
  const out = []
  for (const t of tags) {
    if (typeof t !== 'string' || t === '') return null
    if (!out.includes(t)) out.push(t)
  }
  return out
}

export const PHOTO_TYPES = ['general', 'interior', 'exterior', 'menu', 'sign']

// Returns the photo type to store, or null if the given type isn't allowed.
export function normalizePhotoType(type) {
  if (type === undefined || type === null || type === '') return 'general'
  return PHOTO_TYPES.includes(type) ? type : null
}

export const MAX_PARTITIONS = 8
export const MAX_PARTITION_BYTES = 20 * 1024

function allNumbersFinite(value) {
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(allNumbersFinite)
  if (value && typeof value === 'object') return Object.values(value).every(allNumbersFinite)
  return true
}

// Validate a PUT /api/partitions/:buildingId body. Returns an error message,
// or null if the body is acceptable.
export function validatePartitionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Body must be a JSON object'
  // `partitions` may be absent (e.g. only buildingColor set), but if present must be an array
  if (body.partitions !== undefined) {
    if (!Array.isArray(body.partitions)) return 'partitions must be an array'
    if (body.partitions.length > MAX_PARTITIONS) return `At most ${MAX_PARTITIONS} partitions allowed`
    if (!body.partitions.every(p => p && typeof p === 'object' && !Array.isArray(p))) {
      return 'Each partition must be an object'
    }
  }
  if (!allNumbersFinite(body)) return 'Numeric fields must be finite numbers'
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_PARTITION_BYTES) return 'Partition data too large (max 20 kB)'
  return null
}
