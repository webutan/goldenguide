// "Who's open tonight" timeline (F03): which bars open on a given night, where
// their strips sit on an 18:00 -> 06:00 axis, and where "now" is on it.
// Pure functions; all times are Tokyo time in the `{ day, minutes }` form of
// utils/openNow.js.
import { dayInterval, DAY_MIN } from './openNow.js'

export const NIGHT_START = 18 * 60          // 18:00 on the night's own day
export const NIGHT_END = DAY_MIN + 6 * 60   // 06:00 the next morning
export const NIGHT_LENGTH = NIGHT_END - NIGHT_START

const mod7 = d => ((d % 7) + 7) % 7

/**
 * The day (0-6) whose night is "tonight". Until 06:00 it is still last
 * night: at 02:00 on Thursday, tonight is Wednesday's night.
 */
export function tonightDay(now) {
  return now.minutes < NIGHT_END - DAY_MIN ? mod7(now.day - 1) : mod7(now.day)
}

/**
 * Where `now` is on the axis of the night of `nightDay`, in minutes after
 * 18:00, or null when it is outside 18:00-06:00 of that night.
 */
export function nowPosition(now, nightDay) {
  if (tonightDay(now) !== mod7(nightDay)) return null
  const sinceMidnight = now.day === mod7(nightDay) ? now.minutes : DAY_MIN + now.minutes
  const pos = sinceMidnight - NIGHT_START
  return pos >= 0 && pos < NIGHT_LENGTH ? pos : null
}

/**
 * A bar's open hours on the night of `day`.
 *
 * @returns {null | {start: number, end: number, opens: number, closes: number,
 *   clippedStart: boolean, clippedEnd: boolean}[]}
 *   null when the hours are unknown; otherwise the strips to draw, in order
 *   (empty when the bar is closed that night). `start`/`end` are minutes after
 *   18:00, clipped to the axis; `opens`/`closes` are the real times in minutes
 *   after 18:00 (so they can lie outside 0..720), and `clipped*` say whether
 *   the bar is already open at 18:00 / still open at 06:00.
 */
export function nightSegments(schedule, day) {
  if (!schedule || !schedule.default) return null
  // Yesterday's hours can run past 18:00 today, and tomorrow's can start
  // before 06:00, so all three days can put a strip on the axis.
  const intervals = []
  for (const offset of [-1, 0, 1]) {
    const iv = dayInterval(schedule, day + offset)
    if (iv === 'unknown') return null
    if (iv) intervals.push({ start: offset * DAY_MIN + iv.start, end: offset * DAY_MIN + iv.end })
  }
  // Back-to-back hours (a 24h bar) are one strip, not one per day
  const merged = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end)
    else merged.push({ ...iv })
  }
  return merged
    .filter(iv => iv.end > NIGHT_START && iv.start < NIGHT_END)
    .map(iv => ({
      start: Math.max(iv.start, NIGHT_START) - NIGHT_START,
      end: Math.min(iv.end, NIGHT_END) - NIGHT_START,
      opens: iv.start - NIGHT_START,
      closes: iv.end - NIGHT_START,
      clippedStart: iv.start < NIGHT_START,
      clippedEnd: iv.end > NIGHT_END,
    }))
}

/**
 * Sort the active bars into the timeline's three groups for one night.
 * @returns {{ rows: {bar: object, segments: object[]}[], unknown: object[], closed: object[] }}
 */
export function tonightRows(bars, day) {
  const rows = []
  const unknown = []
  const closed = []
  for (const bar of bars || []) {
    if (!bar || bar.is_active === false) continue
    const segments = nightSegments(bar.schedule, day)
    if (segments === null) unknown.push(bar)
    else if (segments.length === 0) closed.push(bar)
    else rows.push({ bar, segments })
  }
  return { rows, unknown, closed }
}

export const SORTS = ['opens', 'closes', 'name']

/**
 * Sorted copy of the rows.
 * @param {'opens'|'closes'|'name'} sort  opens earliest / closes latest / name
 * @param {(bar: object) => string} nameOf  the name shown, for the current language
 */
export function sortRows(rows, sort, nameOf = bar => bar.name_en || bar.name_jp || '') {
  const byName = (a, b) => nameOf(a.bar).localeCompare(nameOf(b.bar), undefined, { sensitivity: 'base', numeric: true })
  const opens = row => row.segments[0].opens
  const closes = row => row.segments[row.segments.length - 1].closes
  const compare = {
    opens: (a, b) => opens(a) - opens(b) || closes(a) - closes(b) || byName(a, b),
    closes: (a, b) => closes(b) - closes(a) || opens(a) - opens(b) || byName(a, b),
    name: byName,
  }[sort] || byName
  return [...rows].sort(compare)
}

/** Minutes after 18:00 -> "19:00", "02:30" (wraps around midnight). */
export function formatAxisTime(pos) {
  const m = (((NIGHT_START + pos) % DAY_MIN) + DAY_MIN) % DAY_MIN
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * A row's hours as text: "19:00-03:00", several strips joined with ", ".
 * Returns null for a bar that is open the whole night and beyond (the caller
 * shows its own "24 hours" label).
 */
export function formatHours(segments) {
  const only = segments.length === 1 ? segments[0] : null
  if (only && only.clippedStart && only.clippedEnd && only.closes - only.opens >= DAY_MIN) return null
  // Two strips of the same daily hours (20:00-19:00) read as one
  return [...new Set(segments.map(s => `${formatAxisTime(s.opens)}–${formatAxisTime(s.closes)}`))].join(', ')
}

/**
 * Simple windowing for a list of fixed-height rows: the index range to render
 * and the padding that stands in for the rows left out.
 */
export function visibleRange({ scrollTop = 0, viewportHeight = 0, rowHeight, count, overscan = 6 }) {
  if (!(rowHeight > 0) || count <= 0) return { start: 0, end: 0, padTop: 0, padBottom: 0 }
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight)
  const visible = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1
  const start = Math.max(0, Math.min(count, first - overscan))
  const end = Math.max(start, Math.min(count, first + visible + overscan))
  return { start, end, padTop: start * rowHeight, padBottom: (count - end) * rowHeight }
}
