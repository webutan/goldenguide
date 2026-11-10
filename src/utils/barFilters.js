// Shared bar-filter logic used by the map, the bar drawer and the directory.
// Keep this the single source of truth so every view shows the same bars.

/**
 * Parse a price field (stored as TEXT) into a number.
 * "¥1,000" → 1000, "800" → 800, 1500 → 1500. Unknown / unparseable → null.
 */
export function parsePrice(v) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const cleaned = String(v).replace(/[^\d.]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function tagIdsOf(bar) {
  return (bar.tags || []).map(t => (typeof t === 'string' ? t : t.id))
}

// Unknown prices pass price filters (callers show a "?" marker instead).
function priceInRange(price, min, max) {
  if (price == null) return true
  if (min != null && price < min) return false
  if (max != null && price > max) return false
  return true
}

/**
 * @param {object} bar
 * @param {{tags?: string[], tagMode?: 'or'|'and', chargeMin?: number|null, chargeMax?: number|null,
 *   drinkMin?: number|null, drinkMax?: number|null, floor?: number|null, openNow?: boolean,
 *   favorites?: boolean, visited?: boolean}} filters
 * @param {{openBarIds?: Set<string>, isFavorited?: (id) => boolean, isVisited?: (id) => boolean}} ctx
 */
export function barPasses(bar, filters = {}, ctx = {}) {
  const f = filters
  if (f.floor != null && Number(bar.floor ?? 1) !== Number(f.floor)) return false

  if (f.tags && f.tags.length > 0) {
    const ids = tagIdsOf(bar)
    const ok = f.tagMode === 'and'
      ? f.tags.every(t => ids.includes(t))
      : f.tags.some(t => ids.includes(t))
    if (!ok) return false
  }

  if (!priceInRange(parsePrice(bar.charge), f.chargeMin, f.chargeMax)) return false
  if (!priceInRange(parsePrice(bar.drink_price), f.drinkMin, f.drinkMax)) return false

  if (f.openNow && !(ctx.openBarIds && ctx.openBarIds.has(String(bar.id)))) return false
  if (f.favorites && !(ctx.isFavorited && ctx.isFavorited(bar.id))) return false
  if (f.visited && !(ctx.isVisited && ctx.isVisited(bar.id))) return false
  return true
}

export function hasActiveFilters(filters = {}) {
  const f = filters
  return (
    (f.tags != null && f.tags.length > 0) ||
    f.chargeMin != null || f.chargeMax != null ||
    f.drinkMin != null || f.drinkMax != null ||
    f.floor != null ||
    !!f.openNow || !!f.favorites || !!f.visited
  )
}

/**
 * True when a price filter is active but this bar's matching price is unknown,
 * i.e. the bar passed the filter only because its price is unconfirmed.
 */
export function hasUnknownFilteredPrice(bar, filters = {}) {
  const f = filters
  const chargeActive = f.chargeMin != null || f.chargeMax != null
  const drinkActive = f.drinkMin != null || f.drinkMax != null
  return (chargeActive && parsePrice(bar.charge) == null) ||
    (drinkActive && parsePrice(bar.drink_price) == null)
}

// Display helper: prefix a stored price with a single ¥ even when the stored
// text already contains one (e.g. "¥1,000" or "￥1000").
export function yen(v) {
  if (v == null || v === '') return ''
  return '¥' + String(v).trim().replace(/^[¥￥\s]+/, '')
}
