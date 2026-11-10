# R01: Map render performance: separate hover from geometry, declarative building colours

**Phase 3** · Size **L** · Agent ~4–6h · Review ~45 min · Depends on: B03 (shared filters) · Touches: `src/components/GoldenGaiMap.vue` (heavy), possibly new child components under `src/components/map/`

## Why
- `partitionRects` reads `props.hoveredBarId` and `searchHighlightedBars`, so **every hover** recomputes the geometry of every split building. That cascades into `barPartitionColor`, `buildingBarCountBadges` and `buildingLabelData`, and re-renders the whole SVG template (all labels, badges and rects).
- Building colours are set **imperatively** by `updateBuildingColors()` (querySelectorAll + classList/style). It's triggered by seven separate watchers, each doing `setTimeout(updateBuildingColors, 50)`, so one filter change can run it several times.
- `barPassesFilters` is evaluated many times per bar per change.

## Steps
1. **Memoised filter set:** a single `computed` `passingBarIds: Set<string> | null`, using B03's `barPasses`. Everything else (badges, dimming, labels, tooltip) reads that set and never calls the filter function again.
2. **Pure geometry:** `partitionGeometry` computed depends only on `partitions`, `bars` and building data (no hover, search or filter). The highlight, dim and opacity state is a separate small computed keyed by building/slot.
3. **Declarative colours:** a computed `buildingStyle: Record<bldgId, { fill, classes }>`. Apply it with a single `watchEffect` that diffs against the last applied state and touches only the paths that changed. The base map is raw SVG from `v-html`, so a diffing apply step is the pragmatic option. Delete the seven `setTimeout` watchers.
4. Split the template into child components (`MapPartitions.vue`, `MapLabels.vue`, `MapBadges.vue`, `MapAnnotations.vue`), each getting only the props it needs, so a hover change re-renders only the partitions layer.
5. Hover/selection classes (`building-hover`, `building-selected`) stay imperative, but go through one helper that uses `CSS.escape` everywhere (`clearHighlight` at ~line 616 doesn't escape).
6. Tooltip: follow the mouse (the current code positions it from the stale event captured at timer start), and fix the "0.5s" comment versus the 150 ms timer.

## Measuring
Before and after: in Playwright, record `performance.now()` around 50 synthetic `mousemove`s across buildings, and count component renders with Vue's `onRenderTriggered` in dev. Include both numbers in the summary.

## Acceptance criteria
- [ ] No `setTimeout(updateBuildingColors` left
- [ ] Hovering doesn't recompute partition geometry (verify with a dev-only counter)
- [ ] Visuals are identical: screenshots of default, with filters, with search, hover and selected, at zoomed-out and zoomed-in levels
- [ ] Measured hover cost reduced (report the numbers)
