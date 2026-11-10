// Gai-chan's art is cached on first use, not precached, so offline it can be
// missing. An image that fails to load is hidden instead of showing the
// browser's broken-image icon: it keeps its box, and comes back if a later
// src loads. Use as @error / @load on an <img>, or with .capture on a
// container (image load and error events do not bubble).
export function onArtError(e) {
  if (e.target instanceof HTMLImageElement) e.target.style.visibility = 'hidden'
}

export function onArtLoad(e) {
  if (e.target instanceof HTMLImageElement) e.target.style.visibility = ''
}
