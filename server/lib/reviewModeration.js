import { hashIp } from './ipHash.js'
// Pure review-moderation rules shared by the reviews route. No DB access here
// so they can be unit-tested directly.

// Distinct reporters (one per IP) after which a review is hidden automatically.
export const REPORT_AUTO_HIDE_THRESHOLD = 3

// Filters accepted by GET /api/reviews/admin?status=...
export const ADMIN_REVIEW_STATUSES = ['reported', 'hidden', 'all']

// Unknown or missing status falls back to the moderation queue.
export function parseAdminReviewStatus(value) {
  return ADMIN_REVIEW_STATUSES.includes(value) ? value : 'reported'
}

/**
 * Should a review be hidden after a new report brought it to `reportCount`?
 * A review an admin has explicitly un-hidden (`autoHideExempt`) is never
 * auto-hidden again; otherwise three visitors could keep censoring it.
 */
export function shouldAutoHide({ reportCount, autoHideExempt }) {
  if (autoHideExempt) return false
  return Number.isInteger(reportCount) && reportCount >= REPORT_AUTO_HIDE_THRESHOLD
}

// Stable per-visitor key for "one report per visitor per review": a keyed hash
// of the IP (see ipHash.js), so the reports table never holds visitor
// addresses. Changing the key only means old reporters could report once more.
export const reporterKey = hashIp

// ── Admin list paging (GET /api/reviews/admin) ──────────────────────────────
// Keyset ("cursor") paging: a page starts strictly after the last row of the
// previous one in the list's sort order, so hiding or deleting reviews while
// paging never shifts the following pages (an offset would skip rows).

export const ADMIN_REVIEW_PAGE_DEFAULT = 50
export const ADMIN_REVIEW_PAGE_MAX = 100

/** Page size from ?limit=: 1..ADMIN_REVIEW_PAGE_MAX, default when missing/invalid. */
export function parseAdminReviewLimit(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return ADMIN_REVIEW_PAGE_DEFAULT
  return Math.min(Number(value), ADMIN_REVIEW_PAGE_MAX)
}

// created_at as Postgres prints it for us in UTC with microseconds, so the
// cursor compares equal to the stored value (a JS Date would drop them).
const CURSOR_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/
const INT_RE = /^(0|[1-9]\d{0,9})$/
const isInt32 = text => INT_RE.test(text) && Number(text) <= 2147483647

/**
 * The cursor after `row` (which carries `cursor_ts`, `id` and `report_count`).
 * 'reported' sorts by report count first, so its cursor carries the count too.
 */
export function encodeAdminReviewCursor(status, row) {
  const tail = `${row.cursor_ts}_${row.id}`
  return status === 'reported' ? `${row.report_count}_${tail}` : tail
}

/**
 * Parse ?cursor= for `status`.
 * @returns null when there is no cursor, `{ error }` when it is malformed,
 *   else `{ ts, id }` (plus `reports` for 'reported').
 */
export function parseAdminReviewCursor(status, value) {
  if (value === undefined || value === null || value === '') return null
  const bad = { error: 'Invalid cursor' }
  if (typeof value !== 'string') return bad
  const parts = value.split('_')
  if (parts.length !== (status === 'reported' ? 3 : 2)) return bad
  const [id, ts, reports] = parts.reverse()
  if (!isInt32(id) || !CURSOR_TS_RE.test(ts)) return bad
  if (status !== 'reported') return { ts, id: Number(id) }
  if (!isInt32(reports)) return bad
  return { ts, id: Number(id), reports: Number(reports) }
}
