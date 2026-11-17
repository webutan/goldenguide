// The streets of Golden Gai: the colour each one has on the map (and on the
// Tonight timeline) and its name. Pure data, shared by the map, the admin
// console and the timeline.

// Street-based building colors
export const STREET_COLORS = {
  'hanazono-1':  '#8B2500',   // deep red-orange
  'hanazono-3':  '#005559',   // teal
  'hanazono-5':  '#3a5c20',   // olive green
  'hanazono-8':  '#6a1a48',   // dark wine
  'maneki-dori': '#4a3010',   // dark brown
}
export const STREET_COLOR_DEFAULT = '#1a0e2a'  // fallback: dark purple

export function streetColor(street) {
  return STREET_COLORS[street] || STREET_COLOR_DEFAULT
}

/** Street id -> label: "hanazono-1" -> "Hanazono 1". */
export function streetName(id) {
  return String(id || '').split(/[-_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}
