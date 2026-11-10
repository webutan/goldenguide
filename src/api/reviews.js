import { adminHeaders } from './index.js'
import { retryAfterOf } from '../utils/retryAfter.js'

const BASE = import.meta.env.VITE_API_BASE || ''

// Throws an Error carrying the HTTP status (429 = rate limited, 401 = not admin)
// and, when the server sent Retry-After, the seconds to wait.
async function expectOk(res, what) {
  if (res.ok) return res.json()
  const data = await res.json().catch(() => ({}))
  const err = new Error(data.error || `Failed to ${what}: ${res.status}`)
  err.status = res.status
  err.retryAfter = retryAfterOf(res)
  throw err
}

/** Flag a review. Public; one report per visitor per review counts. */
export async function reportReview(id) {
  const res = await fetch(`${BASE}/api/reviews/${id}/report`, { method: 'POST' })
  return expectOk(res, 'report review')
}

/**
 * Admin: one page of the moderation list, without drawings (`has_drawing`
 * says a review has one; see fetchReviewDrawing).
 * @param {{ status?: 'reported'|'hidden'|'all', barId?: number, cursor?: string, limit?: number }} options
 * @returns {Promise<{ items: Array, nextCursor: string|null, total: number }>}
 */
export async function fetchAdminReviews({ status = 'reported', barId = null, cursor = null, limit = null } = {}) {
  const query = new URLSearchParams({ status })
  if (barId != null) query.set('barId', String(barId))
  if (cursor) query.set('cursor', cursor)
  if (limit) query.set('limit', String(limit))
  const res = await fetch(`${BASE}/api/reviews/admin?${query}`, { headers: adminHeaders() })
  return expectOk(res, 'fetch reviews')
}

/** Admin: a review's drawing (PNG data URL), fetched when it is looked at. */
export async function fetchReviewDrawing(id) {
  const res = await fetch(`${BASE}/api/reviews/admin/${id}/drawing`, { headers: adminHeaders() })
  return (await expectOk(res, 'fetch drawing')).drawing
}

/** Admin: hide or un-hide a review. Resolves with the updated review. */
export async function setReviewHidden(id, hidden) {
  const res = await fetch(`${BASE}/api/reviews/${id}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ hidden }),
  })
  return expectOk(res, 'update review')
}

/** Admin: delete a review for good. */
export async function deleteReview(id) {
  const res = await fetch(`${BASE}/api/reviews/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  return expectOk(res, 'delete review')
}

export async function fetchBarReviews(barId) {
  const res = await fetch(`${BASE}/api/reviews/bar/${barId}`)
  if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`)
  return res.json()
}

export async function fetchWeeklyReviews() {
  const res = await fetch(`${BASE}/api/reviews/week`)
  if (!res.ok) throw new Error(`Failed to fetch weekly reviews: ${res.status}`)
  return res.json()
}

export async function postReview({ barId, nickname, text, drawing }) {
  const res = await fetch(`${BASE}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barId, nickname, text, drawing }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || `Failed to post review: ${res.status}`)
    err.status = res.status // 429 = rate limited (see ReviewDialog)
    err.retryAfter = retryAfterOf(res)
    throw err
  }
  return res.json()
}
