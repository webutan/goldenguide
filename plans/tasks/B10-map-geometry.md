# B10: Map geometry: partition badge centres + panning after user rotation

**Phase 3** (do after R01) · Size **M** · Agent ~3h · Review ~30 min · Depends on: R01 · Touches: `src/components/GoldenGaiMap.vue`

## Why
1. In `partitionRects` (~line 1206), `visibleCenter` is computed by clamping the **unrotated** rect centre to the building bbox, but the rects are drawn inside `rotate(pdata.angle, cx, cy)`. `angle = splitAngle - MAP_ROTATION` is effectively never 0, so badges and labels for split buildings sit in the wrong place. The per-partition admin label offsets may be compensating by hand.
2. After a two-finger rotate on mobile (`userRotation`, applied as a CSS rotate on `.map-svg-wrap`), `panToBuilding`, `centerOnPoint`, `panToUserLocation` and `clampToBounds` all ignore `userRotation`, so search-select and "locate me" pan to the wrong spot. `getSvgPoint` depends on `getScreenCTM` including CSS transforms on HTML ancestors, which is inconsistent in Safari.

## Steps
1. Compute the rect centre, rotate it by `pdata.angle` around `(cx, cy)`, and then find a visible point inside the building. Clamping to the bbox isn't enough for L-shaped buildings: sample the rect's centre line and pick the first point where `path.isPointInFill()` is true, falling back to the bbox clamp.
2. **Migration concern:** admins may have tuned `labelOffsetX/Y` to compensate. Add a per-building flag `centerV2: true`; new centres apply only where it's set. Add an admin button "Reset offsets & use auto centre" to switch individual buildings over, plus an "apply to all" button. Don't change existing visuals until an admin opts in.
3. Write a single `screenToMap(clientX, clientY)` / `mapToScreen(x, y)` pair that accounts for panzoom + MAP_ROTATION + userRotation in pure math (no `getScreenCTM`). Use it in pan, centre, locate and click hit-testing.

## Acceptance criteria
- [ ] With `centerV2` on, badges for every split building sit inside their slot (screenshot 3 split buildings)
- [ ] Rotate 45° on mobile emulation, then search a bar: the map centres on the right building
- [ ] "Locate me" (mock geolocation in Playwright) centres correctly when rotated
- [ ] Taps on partitions still resolve to the correct slot when rotated
