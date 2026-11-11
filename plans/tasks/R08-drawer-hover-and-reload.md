# R08: Bar drawer hover cost; survive a failed reload

**Phase 3** · Size **M** · Agent ~3h · Review ~20 min · Depends on: R02 · Touches: `src/components/BarDrawer.vue`, `src/components/win2000/WinScrollContainer.vue`, `src/composables/useApi.js`, `src/App.vue` (data-loading and drawer wiring only)

## Why
1. **Hover is slow because of the drawer, not the map.** After R01/R02 the map and `App.vue` cost ~10 ms per 50 mouse moves; the desktop bar drawer costs ~85 ms. On hover it swaps its 182-card list for the hovered building's cards, and when the pointer leaves a building for a road it rebuilds all 182 cards (~60 ms each time). `WinScrollContainer` also reads `scrollHeight` in `onUpdated`, forcing layout on every drawer re-render.
2. **A failed data reload blanks the whole app.** `useApi().reload()` sets `error`, and `App.vue` renders only the error screen when `error` is set: map, windows and unsaved form state are all unmounted. This can happen on any admin save or admin toggle when the network blips. (The offline work added a `refreshQuietly()` that never does this; use the same approach for every reload after the first successful load.)

## Steps
1. Measure first with R01's method (Chromium 1280x800, production build, 50 synthetic `mousemove`s across 50 buildings, 5 repeats, median) and record the first-enter and leave costs separately.
2. Keep the full list mounted. Show the hover preview as a separate layer over it (same look as now: title "bldg-N — n bars" + that building's cards), so entering and leaving a building never rebuilds the long list and the list's scroll position survives. Consider `v-memo` or `content-visibility: auto` for the cards if that measurably helps; don't add a virtual-list dependency.
3. `WinScrollContainer`: stop forcing layout on every update (observe size with `ResizeObserver`, or measure only when the content actually changed).
4. Reload resilience: after the first successful load, a failed reload keeps the last good data, never unmounts the app, and tells the user with a Win95 dialog/tray notice (`useDialog`; strings via `t()`). The initial-load failure screen stays.
5. Drawer behaviour must be unchanged: same cards, same order, filters, hover preview, back button, search results mode, selection, share and suggest links.

## Acceptance criteria
- [ ] Total hover cost per 50 moves at least halved; leaving a building onto a road no longer rebuilds the list (report numbers)
- [ ] Drawer screenshots (default, filtered, search results, building selected, hovering) are pixel-identical before/after
- [ ] With `/api/bars` failing after the first load (Playwright `page.route`), an admin toggle or save leaves the app mounted and shows the notice
