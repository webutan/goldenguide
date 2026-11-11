// Pure rules for POST /api/suggestions/:id/apply: what a stored suggestion
// changes on a bar as the bar is NOW. No DB access here so it can be
// unit-tested directly.
//
// This mirrors `suggestionChanges` / `changesToPatch` in
// src/utils/suggestions.js, which the admin Inbox uses to draw the old -> new
// diff. The two files are built into different images (web / api) and cannot
// import each other; tests/suggestionApplyParity.test.js runs the same cases
// through both and fails if they ever disagree.

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const PRICE_FIELDS = ['charge', 'male_charge', 'drink_price']
export const INFO_FIELDS = ['name_jp', 'name_en', 'phone', 'sns']
/** Kinds the endpoint applies. 'moved' and 'new_bar' are handled by hand. */
export const APPLICABLE_KINDS = ['hours', 'price', 'info', 'closed']

const norm = v => (v === null || v === undefined ? '' : String(v).trim())

function hoursOf(value) {
  return value && TIME_RE.test(value.open || '') && TIME_RE.test(value.close || '')
    ? { open: value.open, close: value.close }
    : null
}

// Same schedule regardless of key order, missing/empty `overrides`, etc.
// An empty or unusable schedule is null.
export function canonicalSchedule(schedule) {
  const def = hoursOf(schedule && schedule.default)
  if (!def) return null
  const closedDays = DAY_NAMES.filter(d => Array.isArray(schedule.closedDays) && schedule.closedDays.includes(d))
  const overrides = {}
  for (const day of DAY_NAMES) {
    const hours = hoursOf(schedule.overrides && schedule.overrides[day])
    // Hours on a closed day mean nothing; same as the default is no override
    if (!hours || closedDays.includes(day)) continue
    if (hours.open === def.open && hours.close === def.close) continue
    overrides[day] = hours
  }
  const out = { default: def }
  if (Object.keys(overrides).length > 0) out.overrides = overrides
  out.closedDays = closedDays
  return out
}

export function sameSchedule(a, b) {
  return JSON.stringify(canonicalSchedule(a)) === JSON.stringify(canonicalSchedule(b))
}

export function isApplicableKind(kind) {
  return APPLICABLE_KINDS.includes(kind)
}

/**
 * What applying `suggestion` ({ kind, payload }) changes on `bar` (a bars
 * row): `[{ field, from, to }]`. Empty when the bar already matches, or when
 * the kind is not applied automatically.
 */
export function suggestionChanges(suggestion, bar) {
  if (!suggestion || !bar) return []
  const payload = suggestion.payload || {}
  const changes = []
  switch (suggestion.kind) {
    case 'hours':
      if (canonicalSchedule(payload.schedule) && !sameSchedule(payload.schedule, bar.schedule)) {
        changes.push({ field: 'schedule', from: bar.schedule || null, to: canonicalSchedule(payload.schedule) })
      }
      break
    case 'price':
    case 'info': {
      const fields = suggestion.kind === 'price' ? PRICE_FIELDS : INFO_FIELDS
      for (const key of fields) {
        if (typeof payload[key] !== 'string' || norm(payload[key]) === norm(bar[key])) continue
        // Empty text clears the column (except the required name)
        if (key === 'name_jp' && !norm(payload[key])) continue
        changes.push({ field: key, from: bar[key] ?? null, to: norm(payload[key]) || null })
      }
      if (suggestion.kind === 'price' && typeof payload.cash_only === 'boolean' && payload.cash_only !== !!bar.cash_only) {
        changes.push({ field: 'cash_only', from: !!bar.cash_only, to: payload.cash_only })
      }
      break
    }
    case 'closed':
      if (bar.is_active) changes.push({ field: 'is_active', from: true, to: false })
      break
  }
  return changes
}

/** The bar update for `changes`: exactly the changed fields. */
export function changesToPatch(changes) {
  const patch = {}
  for (const change of changes) patch[change.field] = change.to
  return patch
}
