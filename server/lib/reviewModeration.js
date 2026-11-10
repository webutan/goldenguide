import { createHmac } from 'crypto'
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

// Stable per-visitor key for "one report per visitor per review". A keyed hash
// of the IP, so the reports table never holds visitor addresses. The key is
// the admin password: changing it only means old reporters could report once
// more, which is harmless.
export function reporterKey(ip, secret = process.env.ADMIN_PASSWORD || 'golden-gai') {
  return createHmac('sha256', String(secret)).update(String(ip || 'unknown')).digest('hex').slice(0, 32)
}
