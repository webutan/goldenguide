# R02: Keep the map alive between views (preserve zoom/position)

**Phase 3** · Size **S–M** · Agent ~1.5–2h · Review ~15 min · Depends on: R01 (avoid conflicts in GoldenGaiMap) · Touches: `src/App.vue`, `GoldenGaiMap.vue`

## Why
The map is behind `v-if="activeView === 'map'"`, so each switch to Desktop or Directory destroys panzoom, refetches the SVG text and re-initialises. The user loses their zoom and position.

## Steps
1. Mount the map once (on first visit to the map view) and hide it with `v-show` afterwards. Alternatively wrap it in `<KeepAlive>` with `onActivated`/`onDeactivated`.
2. While hidden, pause expensive things: stop geolocation updates if not tracking, ignore keyboard zoom.
3. On re-show: if the container size changed (rotation or resize while hidden), re-fit while keeping the centre point.
4. Also handle `resize` while visible. Currently `minZoom` is stale and there's no refit (`initPanzoom` uses the size at mount).
5. Replace the `await new Promise(r => setTimeout(r, 200))` hack in `handleSearchSelect` with an exposed `whenReady()` promise from the map.

## Acceptance criteria
- [ ] Zoom in, go to the Directory, come back: same zoom and centre
- [ ] Rotating a phone (Playwright viewport swap) keeps the map usable and correctly bounded
- [ ] Search from the Desktop view still pans to the bar

Also (found in R01): after R01 the dominant hover cost is no longer the map. Every `hover-building` emit re-renders `App.vue` and the bar drawer (~2 ms per move, 110–125 ms per 50 moves, versus ~25 ms for the map itself). Keep the hovered building out of App.vue's render path: e.g. hold it in a small shared composable that only the drawer's title/hover list reads, or pass it to a narrow child component, and measure with R01's method (50 synthetic mousemoves, median of 5).
