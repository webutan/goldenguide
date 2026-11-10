# R07: Windows: pointer-event dragging + keep on screen

**Phase 3** · Size **S** · Agent ~1–1.5h · Review ~10 min · Depends on: none · Touches: `src/composables/useDraggable.js`, `src/components/win2000/WinWindow.vue`, `WinTitleBar.vue`

## Why
Dragging only listens to mouse events, so tablets and touch laptops can't move windows. Windows can be dragged off the right or bottom edge and lost (only `x,y ≥ 0` is clamped), and nothing re-clamps on window resize.

## Steps
1. Switch to Pointer Events (`pointerdown` with `setPointerCapture`, `pointermove`, `pointerup`) and add `touch-action: none` on the title bar.
2. Clamp so at least 40 px of the title bar stays visible and it never goes under the taskbar (`--taskbar-height`). Re-clamp all windows on `resize`.
3. Double-click on the title bar toggles maximise, if `WinWindow` supports maximise; otherwise skip.
4. Optional: classic Win95 "outline drag" (drag a dotted rectangle, move on release) behind a setting. Skip if it gets complicated.

## Acceptance criteria
- [ ] Drag works with touch in Playwright (`hasTouch: true`)
- [ ] Windows can't be lost off-screen; shrinking the viewport pulls them back into view
