import { adminHeaders } from './index.js'

const BASE = import.meta.env.VITE_API_BASE || ''

/**
 * Admin: arrivals counted for a `?ref=` value (door stickers, G05).
 * Resolves with { ref, days, recent, total, bars: [{ bar_id, recent, total, last_day }] }.
 */
export async function fetchRefStats(ref = 'sticker') {
  const res = await fetch(`${BASE}/api/stats/refs?ref=${encodeURIComponent(ref)}`, { headers: adminHeaders() })
  if (!res.ok) {
    const err = new Error(`Failed to fetch ref stats: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}
