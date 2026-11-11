// Pure validation for "Suggest an edit" (POST /api/suggestions). No DB access
// here so it can be unit-tested directly.
//
// A request carries one or more changes for the same bar, each with a `kind`
// and a `payload` that holds only what the visitor wants changed:
//   hours    { schedule: { default: { open, close }, overrides?: { fri: { open, close } }, closedDays?: ['mon'] } }
//   price    { charge?, male_charge?, drink_price?, cash_only? }   (text columns stay text)
//   closed   {}                                                    ("this bar has closed for good")
//   moved    { location }
//   info     { name_jp?, name_en?, phone?, sns? }
//   new_bar  { name, location?, details? }                         (bar_id must be null)
// Anything else (unknown keys, wrong types, over-long strings) is rejected.

export const SUGGESTION_KINDS = ['hours', 'price', 'closed', 'moved', 'info', 'new_bar']
export const SUGGESTION_STATUSES = ['open', 'applied', 'dismissed']
// Filters accepted by GET /api/suggestions?status=...
export const ADMIN_SUGGESTION_FILTERS = [...SUGGESTION_STATUSES, 'all']

export const MAX_PAYLOAD_BYTES = 4096
export const MAX_NOTE_LENGTH = 1000
export const MAX_CONTACT_LENGTH = 200
// One "Send" can carry hours, prices, info and "moved" together.
export const MAX_ITEMS = 4

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const HTTP_URL_RE = /^https?:\/\/\S+$/i

const BODY_KEYS = ['bar_id', 'kind', 'payload', 'items', 'note', 'contact', 'website']
const PRICE_TEXT_MAX = 60
const INFO_LIMITS = { name_jp: 120, name_en: 120, phone: 40, sns: 300 }
const NEW_BAR_LIMITS = { name: 120, location: 300, details: 500 }
const MOVED_LOCATION_MAX = 300

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const fail = error => ({ error })

function unknownKey(obj, allowed) {
  return Object.keys(obj).find(k => !allowed.includes(k)) ?? null
}

// A trimmed string no longer than `max`, or undefined if `value` isn't one.
function text(value, max) {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  return s.length <= max ? s : undefined
}

function validHours(value) {
  if (!isPlainObject(value) || unknownKey(value, ['open', 'close'])) return null
  if (typeof value.open !== 'string' || typeof value.close !== 'string') return null
  if (!TIME_RE.test(value.open) || !TIME_RE.test(value.close)) return null
  return { open: value.open, close: value.close }
}

// Returns the schedule in the shape openNow.js reads, or null if invalid.
export function normalizeSchedule(value) {
  if (!isPlainObject(value) || unknownKey(value, ['default', 'overrides', 'closedDays'])) return null
  const def = validHours(value.default)
  if (!def) return null
  const out = { default: def }

  if (value.overrides !== undefined) {
    if (!isPlainObject(value.overrides) || unknownKey(value.overrides, DAY_NAMES)) return null
    const overrides = {}
    for (const day of DAY_NAMES) {
      if (value.overrides[day] === undefined) continue
      const hours = validHours(value.overrides[day])
      if (!hours) return null
      overrides[day] = hours
    }
    if (Object.keys(overrides).length > 0) out.overrides = overrides
  }

  let closedDays = []
  if (value.closedDays !== undefined) {
    if (!Array.isArray(value.closedDays)) return null
    if (!value.closedDays.every(d => DAY_NAMES.includes(d))) return null
    if (new Set(value.closedDays).size !== value.closedDays.length) return null
    closedDays = DAY_NAMES.filter(d => value.closedDays.includes(d))
  }
  out.closedDays = closedDays
  return out
}

// Each returns the normalized payload, or a string describing what is wrong.
const PAYLOAD_VALIDATORS = {
  hours(payload) {
    if (unknownKey(payload, ['schedule'])) return 'hours: only "schedule" is allowed'
    const schedule = normalizeSchedule(payload.schedule)
    return schedule ? { schedule } : 'hours: invalid schedule'
  },

  price(payload) {
    const bad = unknownKey(payload, ['charge', 'male_charge', 'drink_price', 'cash_only'])
    if (bad) return `price: unknown field "${bad}"`
    const out = {}
    for (const key of ['charge', 'male_charge', 'drink_price']) {
      if (payload[key] === undefined) continue
      const value = text(payload[key], PRICE_TEXT_MAX)
      if (value === undefined) return `price: ${key} must be text of at most ${PRICE_TEXT_MAX} characters`
      out[key] = value
    }
    if (payload.cash_only !== undefined) {
      if (typeof payload.cash_only !== 'boolean') return 'price: cash_only must be true or false'
      out.cash_only = payload.cash_only
    }
    return Object.keys(out).length > 0 ? out : 'price: nothing to change'
  },

  closed(payload) {
    return Object.keys(payload).length === 0 ? {} : 'closed: payload must be empty'
  },

  moved(payload) {
    if (unknownKey(payload, ['location'])) return 'moved: only "location" is allowed'
    const location = text(payload.location, MOVED_LOCATION_MAX)
    return location ? { location } : `moved: location is required (at most ${MOVED_LOCATION_MAX} characters)`
  },

  info(payload) {
    const bad = unknownKey(payload, Object.keys(INFO_LIMITS))
    if (bad) return `info: unknown field "${bad}"`
    const out = {}
    for (const [key, max] of Object.entries(INFO_LIMITS)) {
      if (payload[key] === undefined) continue
      const value = text(payload[key], max)
      if (value === undefined) return `info: ${key} must be text of at most ${max} characters`
      out[key] = value
    }
    if (out.name_jp === '') return 'info: name_jp cannot be empty'
    // `sns` is rendered as a link on the bar card: http(s) only.
    if (out.sns && !HTTP_URL_RE.test(out.sns)) return 'info: sns must be an http(s) URL'
    return Object.keys(out).length > 0 ? out : 'info: nothing to change'
  },

  new_bar(payload) {
    const bad = unknownKey(payload, Object.keys(NEW_BAR_LIMITS))
    if (bad) return `new_bar: unknown field "${bad}"`
    const out = {}
    for (const [key, max] of Object.entries(NEW_BAR_LIMITS)) {
      if (payload[key] === undefined) continue
      const value = text(payload[key], max)
      if (value === undefined) return `new_bar: ${key} must be text of at most ${max} characters`
      if (value) out[key] = value
    }
    return out.name ? out : 'new_bar: name is required'
  },
}

/** Validate one `{ kind, payload }`. Returns `{ value }` or `{ error }`. */
export function validateSuggestionItem(item) {
  if (!isPlainObject(item) || unknownKey(item, ['kind', 'payload'])) return fail('Each item needs only kind and payload')
  if (!SUGGESTION_KINDS.includes(item.kind)) return fail('Unknown kind')
  const payload = item.payload === undefined ? {} : item.payload
  if (!isPlainObject(payload)) return fail('payload must be an object')
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_PAYLOAD_BYTES) return fail('payload too large (max 4 kB)')
  const result = PAYLOAD_VALIDATORS[item.kind](payload)
  if (typeof result === 'string') return fail(result)
  return { value: { kind: item.kind, payload: result } }
}

/**
 * Validate a POST /api/suggestions body:
 *   { bar_id, kind, payload, note?, contact? }           one change, or
 *   { bar_id, items: [{ kind, payload }], note?, contact? }   up to MAX_ITEMS
 * `website` is a honeypot: real visitors never fill it in.
 * @returns {{ error: string } | { value: { barId: number|null, items: Array, note: string|null, contact: string|null, bot: boolean } }}
 */
export function validateSuggestionBody(body) {
  if (!isPlainObject(body)) return fail('Body must be a JSON object')
  const bad = unknownKey(body, BODY_KEYS)
  if (bad) return fail(`Unknown field "${bad}"`)

  let rawItems
  if (body.items !== undefined) {
    if (body.kind !== undefined || body.payload !== undefined) return fail('Send either items or kind/payload, not both')
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
      return fail(`items must be an array of 1 to ${MAX_ITEMS} changes`)
    }
    rawItems = body.items
  } else {
    rawItems = [{ kind: body.kind, payload: body.payload }]
  }

  const items = []
  for (const raw of rawItems) {
    const result = validateSuggestionItem(raw)
    if (result.error) return result
    if (items.some(i => i.kind === result.value.kind)) return fail('Each kind may appear only once')
    items.push(result.value)
  }

  const isNewBar = items.some(i => i.kind === 'new_bar')
  if (isNewBar && items.length > 1) return fail('new_bar cannot be combined with other changes')

  let barId = null
  if (isNewBar) {
    if (body.bar_id !== undefined && body.bar_id !== null) return fail('new_bar must not have a bar_id')
  } else {
    if (!Number.isSafeInteger(body.bar_id) || body.bar_id <= 0 || body.bar_id > 2147483647) return fail('bar_id is required')
    barId = body.bar_id
  }

  let note = null
  if (body.note !== undefined && body.note !== null) {
    note = text(body.note, MAX_NOTE_LENGTH)
    if (note === undefined) return fail(`note must be text of at most ${MAX_NOTE_LENGTH} characters`)
    note = note || null
  }
  let contact = null
  if (body.contact !== undefined && body.contact !== null) {
    contact = text(body.contact, MAX_CONTACT_LENGTH)
    if (contact === undefined) return fail(`contact must be text of at most ${MAX_CONTACT_LENGTH} characters`)
    contact = contact || null
  }

  const bot = body.website !== undefined && body.website !== null && body.website !== ''
  return { value: { barId, items, note, contact, bot } }
}

// Unknown or missing filter falls back to the open queue.
export function parseSuggestionFilter(value) {
  return ADMIN_SUGGESTION_FILTERS.includes(value) ? value : 'open'
}
