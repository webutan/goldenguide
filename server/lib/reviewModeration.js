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
