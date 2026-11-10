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

## Also (found in B09): N-way split geometry — verify first, then fix
B09's agent reported that `partitionRects` divides a padded span of 4 × max(width, height) centred on the building by weight, not the building's own extent. Its click test on a 3-slot building (equal weights, independent mode) hit the middle bar on all 32 sample points: the outer two slots were invisible and unclickable. Only 1, 2 and 4 slots (whole, halves, 2×2 grid) lay out fully. The per-slot "Size" slider is over-sensitive for the same reason.

1. Reproduce with a click grid over a building holding 3 and 5 bars (mock `/api/bars` or use your own DB copy).
2. Split the building's own extent so every slot is visible and clickable for any count, in both split directions, and keep `findClickedPartition` consistent with what is drawn.
3. Existing saved partitions were tuned by eye against the old geometry: list which stored buildings change appearance, and keep 2-slot and 4-slot layouts pixel-identical where weights are equal.
4. Then remove the workaround in `src/utils/partitions.js`: delete `FULLY_VISIBLE_SLOT_COUNTS` and the "join the last slot" branch so an unassigned bar always gets its own synthetic slot, and update `tests/partitions.test.js`.

Also (found in B09, admin gaps): `removePartition` in AdminPanel can only remove the last slot, and there is no `DELETE /api/partitions/:buildingId`, so a building's split can only be reset in the database. Add both.
