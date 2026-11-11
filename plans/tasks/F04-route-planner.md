# F04: "My Route": bar-hop planner

**Phase 5** · Size **L** · Agent ~5–6h · Review ~45 min · Depends on: R01, B03, F01 nice-to-have · Touches: new `src/composables/useRoute.js`, new `src/components/RouteWindow.vue`, `GoldenGaiMap.vue` (new overlay layer), `BarPopup.vue`/`BarDrawer.vue` ("Add to route"), `src/data/` walk graph

## Why
Turns saved bars into a plan for the night: "Bar A → B → C, 6 min walking total, all open until 2am".

## Steps
1. **Walk graph:** build a simple graph of the alley network (nodes at alley intersections and building entrances) from `src/assets/map.svg` / `buildings.json`, as a one-off script `scripts/build-walk-graph.js` that writes `src/data/walk-graph.json`. If automatic extraction is unreliable, add an admin tool to click-place nodes and edges. Document what you chose.
2. **Planner:** given a selected set of bars (from favourites or "Add to route"), order them by walking distance (nearest neighbour + 2-opt; the sets are tiny) with an optional constraint "respect closing times" (visit early-closing bars first, using B02 helpers). Unit-test it.
3. **Map overlay:** a dashed Win95-style path (2px, `#ffcc44`, square caps) with numbered square markers 1..N; the current leg is highlighted.
4. **RouteWindow:** a numbered list with drag-to-reorder (pointer events), per-leg walking time (~70 m/min), opening-hours warnings ("⚠ closes before you'd arrive"), [Optimise] [Clear] [Share route] (URL `?route=slug1,slug2`, via G01).
5. Persist the route locally (B06).

## Acceptance criteria
- [ ] 5 favourites → optimised order with a visibly sensible path
- [ ] Reordering updates the path and times
- [ ] A shared route URL reproduces the route on another device
