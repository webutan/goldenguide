// Bar Roulette (F02): which bars are in the draw, how likely each one is, and
// the order the reel shows names in. Pure functions; `random` is injectable
// so tests can make every spin deterministic.
import { barPasses, parsePrice } from './barFilters.js'

export const UNVISITED_WEIGHT = 2
export const OPEN_WEIGHT = 3
export const ENGLISH_TAG = 'english-ok'

// A cover charge written as words rather than as a number
const FREE_WORDS = /^(?:none|no charge|no cover|free|なし|無し|無料|ノーチャージ|チャージなし)$/i

/**
 * True only when the bar is known to have no cover charge: a stored "0" /
 * "¥0", or one of the usual words for it. An empty or unparseable charge is
 * unknown, not free, so it does not count (unlike the map's price filters,
 * which let unknown prices through: "pick me a free one" must not land on a
 * bar that might charge).
 */
export function hasNoCover(bar) {
  const raw = bar?.charge
  if (raw == null) return false
  const text = String(raw).normalize('NFKC').trim()
  if (text === '') return false
  if (FREE_WORDS.test(text)) return true
  return parsePrice(text) === 0
}

function tagIdsOf(bar) {
  return (bar.tags || []).map(tag => (typeof tag === 'string' ? tag : tag.id))
}

/**
 * The bars a spin can land on.
 *
 * @param {object[]} bars
 * @param {{openNow?: boolean, unvisited?: boolean, noCover?: boolean, english?: boolean,
 *   mapFilters?: object|null}} options  `mapFilters` is the map's filter
 *   object (see barPasses), or null when "Use my map filters" is off.
 * @param {{openBarIds?: Set<string>, isVisited?: (id) => boolean, isFavorited?: (id) => boolean}} ctx
 */
export function rouletteCandidates(bars, options = {}, ctx = {}) {
  const o = options
  return (bars || []).filter(bar => {
    if (!bar || bar.is_active === false) return false
    if (o.mapFilters && !barPasses(bar, o.mapFilters, ctx)) return false
    // Same meaning as the map's "Open Now": open, or hours unknown
    if (o.openNow && !(ctx.openBarIds && ctx.openBarIds.has(String(bar.id)))) return false
    if (o.unvisited && ctx.isVisited && ctx.isVisited(bar.id)) return false
    if (o.noCover && !hasNoCover(bar)) return false
    if (o.english && !tagIdsOf(bar).includes(ENGLISH_TAG)) return false
    return true
  })
}

/**
 * How many tickets a bar holds in the draw: unvisited bars x2, bars that are
 * confirmed open right now x3 (so x6 for both).
 *
 * @param {object} bar
 * @param {{confirmedOpenIds?: Set<string>, isVisited?: (id) => boolean}} ctx
 */
export function barWeight(bar, ctx = {}) {
  let weight = 1
  if (!(ctx.isVisited && ctx.isVisited(bar.id))) weight *= UNVISITED_WEIGHT
  if (ctx.confirmedOpenIds && ctx.confirmedOpenIds.has(String(bar.id))) weight *= OPEN_WEIGHT
  return weight
}

/**
 * Weighted random pick: each item's chance is its weight over the total.
 * Items with a weight that is not a positive number cannot be picked.
 * Returns null when nothing can be.
 */
export function weightedPick(items, weightOf = () => 1, random = Math.random) {
  const weights = items.map(item => {
    const w = Number(weightOf(item))
    return Number.isFinite(w) && w > 0 ? w : 0
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return null
  let ticket = random() * total
  let last = null
  for (let i = 0; i < items.length; i++) {
    if (weights[i] === 0) continue
    last = items[i]
    if (ticket < weights[i]) return items[i]
    ticket -= weights[i]
  }
  // Only reachable through floating-point rounding (or a random() of 1)
  return last
}

/** One spin: a weighted pick among the candidates, or null if there are none. */
export function pickBar(candidates, ctx = {}, random = Math.random) {
  return weightedPick(candidates, bar => barWeight(bar, ctx), random)
}

/**
 * The bars the reel flicks through before it stops: up to `length` entries ending
 * on the winner, never showing the same bar twice in a row (when there is
 * more than one to show).
 */
export function reelSequence(candidates, winner, length = 20, random = Math.random) {
  const out = []
  for (let i = 0; i < length - 1; i++) {
    const beforeWinner = i === length - 2
    const pool = candidates.filter(bar => bar !== out[i - 1] && !(beforeWinner && bar === winner))
    if (pool.length === 0) break
    out.push(pool[Math.floor(random() * pool.length)])
  }
  if (out[out.length - 1] === winner) out.pop()
  out.push(winner)
  return out
}
