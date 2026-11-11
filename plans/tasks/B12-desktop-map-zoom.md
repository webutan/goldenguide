# B12: Desktop map input under the 1.25 CSS zoom

**Phase 3** · Size **S–M** · Agent ~2h · Review ~20 min · Depends on: B11 · Touches: `src/components/GoldenGaiMap.vue`, `src/utils/mapGeometry.js`, tests

## Why (found by B10, R02 and B11; all one cause)
`#app` has `zoom: 1.25` above 768 px (`src/styles/main.css`). panzoom reads viewport px while the map is laid out in zoomed px, so on desktop:
- a mouse drag moves the map 1.25× the cursor (drag (100, 50) → map (125, 62.5));
- wheel zoom does not keep the point under the cursor (281.6 px drift after 4 notches; the pan clamp running on every `zoom` event adds to it);
- the +/− buttons zoom about a point that is not the container centre;
- "Fit" (`fitToContainer`, `initPanzoom`, `centerOnPoint`) is 1.25× too large, so the minimum zoom does not show the whole map;
- the initial view sits outside the pan limits, so the first drag/wheel/double-tap jumps (~16 px on mobile, more on desktop);
- the zoom / fit / locate buttons sit under the always-visible bar drawer on desktop and cannot be clicked outside admin mode.

Each of these was deliberately left alone by earlier tasks so their before/after screenshots stayed identical. B11 already routes mouse drag and wheel through its own rotation-aware maths while the map is rotated (panzoom's `beforeMouseDown` / `beforeWheel`).

## Steps
1. Reproduce each number above at 1280x800.
2. Use B11's gesture path for mouse drag and wheel at every rotation (not only when rotated), so there is one implementation that is correct under CSS zoom; keep keyboard zoom and double-click.
3. Make fit / initial centre / zoom buttons use the B10 helpers (`panToCenter`, `clampPan`, `screenToMap`), and start inside the pan limits.
4. Move the desktop map controls clear of the drawer.
5. The default view WILL change (true fit instead of 1.25× fit): show before/after screenshots at 1280x800, 1920x1080 and 390x844 and say what changed. Mobile (no CSS zoom) should be unchanged apart from the initial clamp.

## Acceptance criteria
- [ ] Desktop drag tracks the cursor 1:1; wheel zoom keeps the point under the cursor within 5 px
- [ ] "Fit" shows the whole map at 1280x800 and 1920x1080
- [ ] No jump on the first interaction
- [ ] Zoom / fit / locate buttons are clickable on desktop with the drawer open
