const BASE = import.meta.env.VITE_API_BASE || ''

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
    throw new Error(data.error || `Failed to post review: ${res.status}`)
  }
  return res.json()
}
