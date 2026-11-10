import { adminHeaders } from './index.js'

const BASE = import.meta.env.VITE_API_BASE || ''

// Throws an Error carrying the HTTP status (429 = rate limited, 401 = not admin).
async function expectOk(res, what) {
  if (res.ok) return res.json()
  const data = await res.json().catch(() => ({}))
  const err = new Error(data.error || `Failed to ${what}: ${res.status}`)
  err.status = res.status
  throw err
}

/**
 * Public: send corrections for a bar (or a missing bar: barId null and one
 * `new_bar` item). `items` is `[{ kind, payload }]`. `website` is the honeypot.
 */
export async function postSuggestion({ barId = null, items, note = '', contact = '', website = '' }) {
  const res = await fetch(`${BASE}/api/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bar_id: barId, items, note, contact, website }),
  })
  return expectOk(res, 'send suggestion')
}

/** Admin: suggestions with the bar's current values. status = 'open' | 'applied' | 'dismissed' | 'all'. */
export async function fetchSuggestions(status = 'open') {
  const res = await fetch(`${BASE}/api/suggestions?status=${encodeURIComponent(status)}`, {
    headers: adminHeaders(),
  })
  return expectOk(res, 'fetch suggestions')
}

/** Admin: number of open suggestions. */
export async function fetchSuggestionCount() {
  const res = await fetch(`${BASE}/api/suggestions/count`, { headers: adminHeaders() })
  return (await expectOk(res, 'count suggestions')).open
}

/** Admin: mark a suggestion 'applied' or 'dismissed' (the row is kept). */
export async function setSuggestionStatus(id, status) {
  const res = await fetch(`${BASE}/api/suggestions/${id}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  })
  return expectOk(res, 'update suggestion')
}
