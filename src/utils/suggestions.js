// Pure helpers for "Suggest an edit": the visitor's form <-> the payload sent
// to POST /api/suggestions, and the admin Inbox diff (old -> new) computed
// against the bar's CURRENT values. No Vue here so it can be unit tested.
import { DAY_NAMES } from './openNow.js'

export const PRICE_FIELDS = ['charge', 'male_charge', 'drink_price']
export const INFO_FIELDS = ['name_jp', 'name_en', 'phone', 'sns']
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const norm = v => (v === null || v === undefined ? '' : String(v).trim())

// ── Schedule ─────────────────────────────────────────────────────────────────

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

/**
 * One-line description, e.g. "18:00–02:00 · Fri 18:00–05:00 · Closed: Mon".
 * `dayLabel(day)` and `closedLabel` come from the caller's i18n.
 */
export function formatSchedule(schedule, dayLabel = d => d, closedLabel = 'Closed') {
  const s = canonicalSchedule(schedule)
  if (!s) return ''
  const parts = [`${s.default.open}–${s.default.close}`]
  for (const day of DAY_NAMES) {
    if (s.overrides && s.overrides[day]) parts.push(`${dayLabel(day)} ${s.overrides[day].open}–${s.overrides[day].close}`)
  }
  if (s.closedDays.length > 0) parts.push(`${closedLabel}: ${s.closedDays.map(dayLabel).join(', ')}`)
  return parts.join(' · ')
}

// ── Visitor form ─────────────────────────────────────────────────────────────

/** Editable copy of a bar's current values (the dialog is pre-filled with it). */
export function barToForm(bar) {
  const s = canonicalSchedule(bar && bar.schedule)
  const days = {}
  for (const day of DAY_NAMES) {
    const override = s && s.overrides && s.overrides[day]
    days[day] = {
      closed: !!s && s.closedDays.includes(day),
      custom: !!override,
      open: override ? override.open : '',
      close: override ? override.close : '',
    }
  }
  return {
    open: s ? s.default.open : '',
    close: s ? s.default.close : '',
    days,
    charge: norm(bar && bar.charge),
    male_charge: norm(bar && bar.male_charge),
    drink_price: norm(bar && bar.drink_price),
    cash_only: !!(bar && bar.cash_only),
    name_jp: norm(bar && bar.name_jp),
    name_en: norm(bar && bar.name_en),
    phone: norm(bar && bar.phone),
    sns: norm(bar && bar.sns),
    moved: false,
    location: '',
  }
}

/**
 * Schedule described by the Hours tab.
 * @returns {{ schedule: object|null, error: string|null }} `schedule` is null
 *   when no usual hours are entered; `error` is 'suggestHoursIncomplete' when only
 *   one of a pair of times is filled in.
 */
export function formToSchedule(form) {
  const hasOpen = TIME_RE.test(form.open || '')
  const hasClose = TIME_RE.test(form.close || '')
  if (hasOpen !== hasClose) return { schedule: null, error: 'suggestHoursIncomplete' }
  const dayEntries = DAY_NAMES.map(day => [day, form.days[day]])
  if (!hasOpen) {
    // Days ticked without usual hours can't be expressed in a schedule
    const touched = dayEntries.some(([, d]) => d.closed || d.custom)
    return { schedule: null, error: touched ? 'suggestHoursIncomplete' : null }
  }
  const schedule = { default: { open: form.open, close: form.close }, closedDays: [] }
  const overrides = {}
  for (const [day, d] of dayEntries) {
    if (d.closed) { schedule.closedDays.push(day); continue }
    if (!d.custom) continue
    if (!TIME_RE.test(d.open || '') || !TIME_RE.test(d.close || '')) return { schedule: null, error: 'suggestHoursIncomplete' }
    overrides[day] = { open: d.open, close: d.close }
  }
  if (Object.keys(overrides).length > 0) schedule.overrides = overrides
  return { schedule: canonicalSchedule(schedule), error: null }
}

/**
 * What the visitor changed, as `[{ kind, payload }]` for the API: only fields
 * that differ from the bar's current values.
 * @returns {{ items: Array, error: string|null }} `error` is an i18n key.
 */
export function buildSuggestionItems(bar, form) {
  const items = []

  const { schedule, error } = formToSchedule(form)
  if (error) return { items: [], error }
  if (schedule && !sameSchedule(schedule, bar.schedule)) items.push({ kind: 'hours', payload: { schedule } })

  const price = {}
  for (const key of PRICE_FIELDS) {
    if (norm(form[key]) !== norm(bar[key])) price[key] = norm(form[key])
  }
  if (!!form.cash_only !== !!bar.cash_only) price.cash_only = !!form.cash_only
  if (Object.keys(price).length > 0) items.push({ kind: 'price', payload: price })

  const info = {}
  for (const key of INFO_FIELDS) {
    if (norm(form[key]) !== norm(bar[key])) info[key] = norm(form[key])
  }
  if (info.name_jp === '') return { items: [], error: 'suggestNameRequired' }
  if (info.sns && !/^https?:\/\/\S+$/i.test(info.sns)) return { items: [], error: 'suggestLinkInvalid' }
  if (Object.keys(info).length > 0) items.push({ kind: 'info', payload: info })

  if (form.moved) {
    if (!norm(form.location)) return { items: [], error: 'suggestLocationRequired' }
    items.push({ kind: 'moved', payload: { location: norm(form.location) } })
  }

  return { items, error: null }
}

// ── Admin Inbox ──────────────────────────────────────────────────────────────

/**
 * What applying `suggestion` would change on `bar` as it is NOW:
 * `[{ field, from, to }]`, empty when the bar already matches or the kind
 * can't be applied automatically ('moved', 'new_bar').
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

/** Body for PATCH /api/bars/:id: exactly the changed fields. */
export function changesToPatch(changes) {
  const patch = {}
  for (const change of changes) patch[change.field] = change.to
  return patch
}
