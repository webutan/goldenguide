// Pure list helpers for review moderation. No Vue here so they can be unit tested.

/**
 * A bar's reviews as an admin sees them: the public list plus the hidden ones
 * (from the admin endpoint), newest first, each review once. A review in both
 * lists (hidden a moment ago, public copy not yet dropped) shows as hidden.
 */
export function mergeBarReviews(publicReviews, hiddenReviews) {
  const hidden = (hiddenReviews || []).map(r => ({ ...r, hidden: true }))
  const hiddenIds = new Set(hidden.map(r => r.id))
  const merged = [...(publicReviews || []).filter(r => !hiddenIds.has(r.id)), ...hidden]
  return merged.sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return diff !== 0 ? diff : b.id - a.id
  })
}

/** Does a review (admin row) belong in the moderation list with this status filter? */
export function matchesAdminStatus(review, status) {
  if (status === 'hidden') return !!review.hidden
  if (status === 'reported') return review.report_count > 0 && !review.auto_hide_exempt
  return true
}

/**
 * The moderation list after `updated` (the server's row for one review)
 * changed: replaced in place, or dropped when it no longer matches `status`.
 * @returns {{ items: Array, removed: boolean }}
 */
export function applyReviewUpdate(items, updated, status) {
  const index = items.findIndex(r => r.id === updated.id)
  if (index === -1) return { items, removed: false }
  if (!matchesAdminStatus(updated, status)) {
    return { items: items.filter(r => r.id !== updated.id), removed: true }
  }
  const next = [...items]
  next[index] = { ...items[index], ...updated }
  return { items: next, removed: false }
}

/** Append a page to a list, skipping reviews already in it (pages can overlap when counts change). */
export function appendReviewPage(items, page) {
  const seen = new Set(items.map(r => r.id))
  return [...items, ...page.filter(r => !seen.has(r.id))]
}
