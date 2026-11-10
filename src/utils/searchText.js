// Bar search: Japanese-aware text matching shared by the map search box and
// the directory, so both find the same bars for the same query.

// Characters that carry no meaning for matching: whitespace, middle dots,
// hyphens/dashes, apostrophes and full stops. The long-vowel mark "ー" is
// deliberately kept: dropping it would make "バー" match every "バ".
const IGNORED = /[\s・·\-‐‑‒–—―'’.]/g

/**
 * Fold a string for comparison:
 * NFKC (full-width → half-width, half-width kana → full-width, composes
 * dakuten), lowercase, katakana → hiragana, then drop separators.
 */
export function normalize(str) {
  if (str == null) return ''
  return String(str)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(IGNORED, '')
}

// Japanese names for the street ids stored on bars, so "花園" or "まねき" work.
const STREET_ALIASES = {
  'hanazono-1': '花園一番街 花園1番街',
  'hanazono-3': '花園三番街 花園3番街',
  'hanazono-5': '花園五番街 花園5番街',
  'hanazono-8': '花園八番街 花園8番街',
  'maneki-dori': 'まねき通り',
}

function tagTexts(bar) {
  const out = []
  for (const tag of bar.tags || []) {
    if (typeof tag === 'string') out.push(tag)
    else if (tag) out.push(tag.label, tag.label_jp, tag.id)
  }
  return out
}

/**
 * Precompute the normalised fields of each bar. Build this once per bar list
 * (e.g. in a computed), not on every keystroke.
 * @returns {{ bar: object, names: string[], other: string[] }[]}
 */
export function buildSearchIndex(bars) {
  return (bars || []).map(bar => ({
    bar,
    names: [bar.name_en, bar.name_jp].map(normalize).filter(Boolean),
    other: [bar.street, STREET_ALIASES[bar.street], ...tagTexts(bar)].map(normalize).filter(Boolean),
  }))
}

// 0 = a name starts with the query, 1 = a name contains it,
// 2 = street or tag contains it, -1 = no match.
function rank(entry, q) {
  if (entry.names.some(n => n.startsWith(q))) return 0
  if (entry.names.some(n => n.includes(q))) return 1
  if (entry.other.some(o => o.includes(q))) return 2
  return -1
}

/**
 * All bars matching `query`, best matches first (name prefix, then name,
 * then street/tag); ties keep the bar list's own order. A query that is
 * empty after normalising matches nothing.
 */
export function searchBars(index, query) {
  const q = normalize(query)
  if (!q) return []
  const hits = []
  for (const entry of index) {
    const r = rank(entry, q)
    if (r >= 0) hits.push({ bar: entry.bar, r })
  }
  return hits.sort((a, b) => a.r - b.r).map(h => h.bar)
}

/** Does this single bar match the query? (Convenience for one-off checks.) */
export function matches(bar, query) {
  return searchBars(buildSearchIndex([bar]), query).length > 0
}
