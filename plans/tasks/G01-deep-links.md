# G01: Shareable deep links (`/bar/<slug>`, view & filter state in the URL)

**Phase 4** · Size **M** · Agent ~3–4h · Review ~30 min · Depends on: B03, R02 · Touches: new `src/composables/useUrlState.js`, `src/App.vue`, `BarPopup.vue`, `BarDrawer.vue`

## Why
Nothing in the app has a URL, so you can't send a friend "this bar". Shareable links are the biggest single lever for growth (WhatsApp, X, LINE, Reddit). Prerequisite for G02, G05 and G06.

## URL scheme
- `/bar/<slug>`: opens the map, pans to the bar's building and opens its card. If the bar has no building, opens the directory popup.
- `/map`, `/directory`: views
- Query: `?lang=en|jp`, `?tags=a,b&mode=and&open=1&floor=2`: filters (map only)
- `/` stays the desktop

## Steps
1. Use a small `useUrlState` composable with `history.pushState`/`popstate`. Don't add vue-router: App.vue's state isn't route-shaped, and a router retrofit is high-risk.
2. On boot, parse the URL **after** the bars load:
   - A deep link **skips the first-visit question flow** (sets lang from `?lang` or the browser language), but shows a small dismissible Gai-chan balloon: "First time in Golden Gai? Read the rules →".
   - The BIOS fast-boots on deep links.
3. Selecting a bar updates the URL (`replaceState` for hover-ish changes, `pushState` for opening a bar). Closing it goes back to `/map`. The browser Back button works.
4. Add a "📋 Copy link" / "Share…" button to the bar card (BarPopup + BarDrawer card). Use `navigator.share` when available, else copy to the clipboard plus a Win95 balloon tooltip "Link copied!".
5. nginx already falls back to `index.html`, so no server change is needed for this task.

## Acceptance criteria
- [ ] Opening `/bar/<real-slug>` in a fresh profile shows the map centred on that bar with its card open, within 1 s of the BIOS finishing
- [ ] Back/Forward move between opened bars
- [ ] Filters survive a reload via the URL
- [ ] Share button works on mobile (navigator.share) and desktop (clipboard)

## Notes from the map track (read before starting)
- The map now mounts on the first visit to the map view and stays mounted (`v-show`); `mapRef.whenReady()` resolves once it can pan. Use it for the `/bar/<slug>` boot path instead of timers. `panToBuilding` lands the building exactly at the map centre.
- There is no search box on the Desktop or Directory views, so `handleSearchSelect`'s "not on the map" branch is only reachable from code: the deep-link boot will be its first real caller. Test it cold (map never mounted) and warm.
- Inactive bars are hidden from the public list; a deep link to one should behave like an unknown slug.
