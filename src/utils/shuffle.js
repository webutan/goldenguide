// Fisher–Yates shuffle: every ordering is equally likely (sorting with a
// random comparator is not). Returns a new array; `random` is injectable so
// tests can make it deterministic.
export function shuffle(items, random = Math.random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
