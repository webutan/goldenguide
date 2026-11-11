# F07: Screensaver

**Phase 5** · Size **S–M** · Agent ~2h · Review ~10 min · Depends on: none (F08 adds settings) · Touches: new `src/components/Screensaver.vue`, `App.vue`

## Why
Pure delight, and very on-brand. Idle desktops in bars and hotel rooms become a little ad.

## Steps
1. After 3 min idle (no pointer, key or touch), and only on the desktop view, never while a text input is focused: a full-screen canvas animation. **"Neon Alley"**: original pixel-art neon signs drifting toward the viewer on a starfield-like 3D projection, using bar names (sampled from active bars) rendered as glowing W95FA text in orange, pink and teal. Original art and animation.
2. A second option, **"Lanterns"**: red chōchin lanterns gently swinging, with occasional bar names. It can be added in F08's settings.
3. Any input dismisses it (and doesn't trigger a click underneath). Pause when the tab is hidden. Cap at 30 fps, and use DPR 1 for performance.
4. Off on mobile by default.

## Acceptance criteria
- [ ] Triggers after the idle threshold (make it configurable; tests use 2 s)
- [ ] Dismiss doesn't click through
- [ ] CPU usage reasonable (no runaway rAF after dismiss)
