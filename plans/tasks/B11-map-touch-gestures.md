# B11: Map touch gestures: two-finger rotate, drag and pinch when rotated

**Phase 3** (after R02) · Size **M** · Agent ~3h · Review ~30 min · Depends on: B10, R02 · Touches: `src/components/GoldenGaiMap.vue`, `src/utils/mapGeometry.js`, tests

## Why (all found while verifying B10; reproduce each first)
- **Two-finger rotate is nearly unreachable.** panzoom stops propagation of `touchstart` on the SVG, so the rotate handler only fires when the second finger lands outside the SVG (e.g. on a map control button). If the first two-finger gesture of a session starts that way, panzoom throws on every move ("zoom requires valid numbers").
- **Drag-pan ignores the rotation:** after rotating, the map moves in a direction turned by the rotation angle. Badges and labels are not counter-rotated, so they read sideways.
- **Pinch focal point is off on mobile:** a pinch centred on a building moves it about 130 px, even unrotated.
- **Annotation dragging (admin)** still uses `getScreenCTM` and applies a viewBox-space delta in map space, so a label moves about 21° off the cursor.

## Steps
1. Reproduce each with real touch input (CDP `Input.dispatchTouchEvent`, mobile context with `hasTouch`) and record the numbers.
2. Own the two-finger gesture in one place: either configure panzoom so pinch and rotate share one handler, or handle two-finger touches yourself and call panzoom's API. Rotation, pinch and pan must compose, and nothing may throw.
3. Use B10's `screenToMap` / `mapToScreen` for drag deltas, pinch focal point and annotation dragging.
4. Counter-rotate badges and labels so they stay upright, or decide with a screenshot that they shouldn't and say why.
5. Keep the compass/reset button behaviour.

## Acceptance criteria
- [ ] Two fingers on the map rotate it; no console errors during any gesture sequence
- [ ] After a 45° rotate, a one-finger drag moves the map with the finger
- [ ] A pinch keeps the point between the fingers within 10 px
- [ ] Admin annotation drag follows the cursor at any rotation
- [ ] Unrotated desktop behaviour is unchanged (screenshots)
