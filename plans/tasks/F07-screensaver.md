# F07: Screensaver

**Phase 5** · Size **S–M** · Agent ~2h · Review ~10 min · Depends on: none (F08 adds settings) · Touches: new `src/components/Screensaver.vue`, `src/gaichan3d/SleepScene.js`, `src/utils/screensaver.js`, `src/composables/useScreensaver.js`, `App.vue`, `WinTaskbar.vue`

## Why
Pure delight, and very on-brand. Idle desktops in bars and hotel rooms become a little ad.

## Steps
1. After 3 min idle (no pointer, key or touch), and only on the desktop view, never while a text input is focused: a full-screen canvas animation. **"Neon Alley"**: original pixel-art neon signs drifting toward the viewer on a starfield-like 3D projection, using bar names (sampled from active bars) rendered as glowing W95FA text in orange, pink and teal. Original art and animation.
2. A second option, **"Lanterns"**: red chōchin lanterns gently swinging, with occasional bar names. It can be added in F08's settings.
3. Any input dismisses it (and doesn't trigger a click underneath). Pause when the tab is hidden. Cap at 30 fps, and use DPR 1 for performance.
4. Off on mobile by default.

5. (Changed during the work, at the owner's request.) Instead of "Neon Alley", the screensaver is the 3D Gai-chan asleep on a futon, anime style: a snot bubble at her nose swells and shrinks as she breathes, and the GAI OS logo bounces around the screen like a DVD logo. When it hits her head she jolts upright clutching the blanket, looks around, yawns and settles back to sleep. She lies on her back with one arm on the covers; the blanket is a draped sheet that follows her. Without WebGL the logo bounces alone. "Lanterns" (step 2) is left for F08.
6. (Added.) A "Screen Saver" entry in the Start menu shows it at once. Settings are read from localStorage `golden-gai-screensaver` (`{ enabled, idleSeconds, mobile }`), ready for F08's Control Panel. It never starts by itself under `prefers-reduced-motion`.

## Acceptance criteria
- [ ] Triggers after the idle threshold (make it configurable; tests use 2 s)
- [ ] Dismiss doesn't click through
- [ ] CPU usage reasonable (no runaway rAF after dismiss)
