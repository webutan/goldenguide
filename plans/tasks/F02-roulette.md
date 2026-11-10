# F02: `Roulette.exe`: pick a random bar for me

**Phase 5** · Size **S–M** · Agent ~2h · Review ~15 min · Depends on: B03, R05, B02 · Touches: new `src/components/RouletteWindow.vue`, `DesktopView.vue`, `App.vue`, `GaiChanDialogue.vue` (optional hook)

## Why
Choice paralysis is real with 280 bars. A playful "just pick one" is fun, shareable and easy.

## Steps
1. Window: a Win95 dialog "Bar Roulette" with a few checkboxes: "Open now", "Use my map filters", "Not visited yet", "No cover charge", "Has English menu" (if such a tag exists; read the tag list).
2. "Spin!" plays a slot-machine animation in a sunken field cycling bar names (W95FA), plus a Win95 progress bar "Consulting the spirits of Shōwa…". It lands on a bar with a weighted-random pick: unvisited ×2, open ×3.
3. Result: the bar's mini card with [Show on map] [Spin again] [Share] (G01 link, if available).
4. Use Fisher–Yates or a weighted pick, not `sort(random)`.
5. Respects `prefers-reduced-motion` (skips the animation).

## Acceptance criteria
- [ ] With filters that match nothing: a friendly Win95 warning, no crash
- [ ] "Show on map" pans to the bar and opens it
- [ ] Unit test the weighted pick (deterministic seed)
