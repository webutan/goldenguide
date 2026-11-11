# B05: BIOS screen double blink + faster boot for returning visitors

**Phase 1** · Size **S** · Agent ~1h · Review ~10 min · Depends on: P01 (preload list changes) is nice-to-have, not required · Touches: `src/components/BiosScreen.vue`, `src/App.vue`

## Why
`maybeShowPrompt()` is called from both `runBootSequence()` and the `assetsLoaded` poller. If both fire, two blink intervals start (the first one leaks) and so do two auto-dismiss timeouts, and the prompt can stop blinking. The BIOS also runs the full ~2 s sequence on every visit, including for regulars.

## Steps
1. Guard `maybeShowPrompt` with a `promptShown` flag. Replace the 100 ms poll with `watch(assetsLoaded, ...)`. Clear every timer in `onUnmounted`.
2. Returning visitors (localStorage `golden-gai-booted` set): run a "fast boot" with all line delays at 0–10 ms and the prompt dismissed after 400 ms. The look stays the same, it's just quick.
3. Respect `prefers-reduced-motion`: use the fast boot.
4. Any key, click or tap still skips immediately.

## Acceptance criteria
- [ ] Prompt blinks steadily on a slow network (Playwright: throttle or delay `/api/bars`)
- [ ] Second visit boots in under ~0.8 s
- [ ] No timers survive after the BIOS unmounts
