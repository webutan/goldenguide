// Pure "open now" logic, independent of Vue so it can be unit tested.
//
// A schedule looks like:
//   { default: { open: '18:00', close: '02:00' },
//     overrides: { fri: { open: '18:00', close: '05:00' } },
//     closedDays: ['mon'] }
//
// `now` is always `{ day, minutes }`: `day` is 0-6 (0 = Sunday) and `minutes`
// is minutes since midnight, both in Tokyo time (see `tokyoNow()`).
//
// Each open day produces one interval that starts on that day:
//   - same-day hours (close > open): [open, close)
//   - wrap-around (close < open):    [open, 24:00 + close), spilling into the next day
//   - 24h (close === open):          the whole calendar day, [00:00, 24:00)

export const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const DAY_MIN = 24 * 60
const WEEK_MIN = 7 * DAY_MIN

function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return null
  const [h, m] = timeStr.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

// Returns null (no hours that day), 'unknown' (open/close missing), or
// { start, end } in minutes relative to that day's midnight.
export function dayInterval(schedule, dayIndex) {
  const name = DAY_NAMES[((dayIndex % 7) + 7) % 7]
  if (schedule.closedDays && schedule.closedDays.includes(name)) return null
  const hours = (schedule.overrides && schedule.overrides[name]) || schedule.default
  const open = timeToMinutes(hours && hours.open)
  const close = timeToMinutes(hours && hours.close)
  if (open === null || close === null) return 'unknown'
  if (close === open) return { start: 0, end: DAY_MIN }
  if (close > open) return { start: open, end: close }
  return { start: open, end: DAY_MIN + close }
}

/**
 * Is the bar open at `now`?
 * @returns {boolean|null} true/false, or null when the schedule is unknown.
 */
export function isBarOpen(schedule, { day, minutes }) {
  if (!schedule || !schedule.default) return null

  const today = dayInterval(schedule, day)
  const yesterday = dayInterval(schedule, day - 1)

  // Early window: still inside yesterday's past-midnight hours.
  if (yesterday && yesterday !== 'unknown' && yesterday.end > DAY_MIN && minutes < yesterday.end - DAY_MIN) {
    return true
  }

  // Main window: today's own hours.
  if (today === 'unknown') return null
  if (today && minutes >= today.start && minutes < today.end) return true

  // Can't rule out yesterday's carry-over if its hours are unknown.
  if (yesterday === 'unknown') return null
  return false
}

// All known open intervals in absolute minutes, from the start of the week
// containing `now` minus one day, through two weeks later. Adjacent or
// overlapping intervals are merged. Returns null if any day is unknown.
function weekIntervals(schedule, day) {
  const intervals = []
  for (let offset = -1; offset < 14; offset++) {
    const d = day + offset
    const iv = dayInterval(schedule, d)
    if (iv === 'unknown') return null
    if (iv) intervals.push({ start: d * DAY_MIN + iv.start, end: d * DAY_MIN + iv.end })
  }
  const merged = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end)
    else merged.push({ ...iv })
  }
  return merged
}

/**
 * Minutes until the bar closes, if it is open now.
 * @returns {number|null} minutes (Infinity if it never closes), or null if
 *   closed now or the schedule is unknown.
 */
export function minutesUntilClose(schedule, now) {
  if (isBarOpen(schedule, now) !== true) return null
  const intervals = weekIntervals(schedule, now.day)
  if (!intervals) return null
  const t = now.day * DAY_MIN + now.minutes
  const current = intervals.find((iv) => t >= iv.start && t < iv.end)
  if (!current) return null
  // Open around the clock: the merged block spans the whole lookahead window.
  if (current.end - current.start >= WEEK_MIN) return Infinity
  return current.end - t
}

/**
 * When the bar next opens, if it is closed now.
 * @returns {{ day: number, minutes: number, inMinutes: number }|null}
 *   `day`/`minutes` in the same form as `now`; null if open now, never opens,
 *   or the schedule is unknown.
 */
export function nextOpen(schedule, now) {
  if (isBarOpen(schedule, now) !== false) return null
  const intervals = weekIntervals(schedule, now.day)
  if (!intervals) return null
  const t = now.day * DAY_MIN + now.minutes
  const next = intervals.find((iv) => iv.start > t)
  if (!next) return null
  return {
    day: ((Math.floor(next.start / DAY_MIN) % 7) + 7) % 7,
    minutes: next.start % DAY_MIN,
    inMinutes: next.start - t,
  }
}

const tokyoFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Current Tokyo time as `{ day, minutes }`. */
export function tokyoNow(date = new Date()) {
  const parts = {}
  for (const p of tokyoFormatter.formatToParts(date)) parts[p.type] = p.value
  const hour = Number(parts.hour) % 24
  return {
    day: WEEKDAY_SHORT.indexOf(parts.weekday),
    minutes: hour * 60 + Number(parts.minute),
  }
}
