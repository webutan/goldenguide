# R04: Dead code, duplicates and small loose ends

**Phase 3** · Size **M** · Agent ~3h · Review ~20 min · Depends on: none (late, to avoid merge noise) · Touches: many files lightly

Everything here is small and low-risk. Larger findings from the same tasks went to R08 (drawer performance and load resilience), R09 (admin usability) and the Backlog section of `plans/README.md`.

## A. Dead code and data (verify every deletion with `grep -rn <name> src scripts server public index.html tests`)
- `sql/` duplicates migrations 001–006 and is stale (the real ones live in `server/migrate.js`).
- `src/data/bars.json` (76 kB), `bar-groups.json`, `alleys.json`, `tags.json`: not imported by `src/`. `scripts/dev-seed.mjs` reads `bars.json` and `buildings.json`; `buildings.json` IS imported by the map. Move the script-only files to `scripts/data/` and fix the paths.
- `src/components/MapBarPanel.vue` is not imported anywhere.
- `fetchBar()` in `src/api/index.js` is unused.
- `hasFloorFilter` and `barFloorMap` in `GoldenGaiMap.vue` are unused; the `labelMode` prop is declared and passed by `App.vue` but never read (remove the prop, the App state and its localStorage key, or wire it up — say which and why).
- `public/wallpaper.jpg` (243 kB) and root `public/gaichanidle.png` (356 kB) appear unused; check the service-worker precache globs and BIOS preload list too.
- The `users` and `visited` tables exist but are unused. **Don't drop them**; document them as reserved in `PROJECT_GUIDE.md`.
- `GaiChanDialogue.vue` shuffles with `sort(() => Math.random() - 0.5)`, which is biased. Use Fisher–Yates (pure helper + test).
- The "Six main tabs have to fit" comment in `AdminPanel.vue` is stale (the strip wraps now).

## B. Duplicates
- `parseTwitterHandle` exists in four copies (`server/lib/feedCore.js`, `BarTwitterPanel.vue`, `BarDrawer.vue`, `BarPopup.vue`). Move the three frontend copies into one `src/utils/` helper with a test that mirrors the server's cases.

## C. Strings that bypass `t()`
- Map tooltip "cover"; annotation toolbar "Add label", "English text", "Size", "Rot".
- `FeedWindow.vue` and `BarTwitterPanel.vue` show raw `err.message` / `data.error`; `FeedWindow` shows "no Twitter accounts" when the request merely failed (the empty-accounts branch hides the error).
- The 429 notice says "a few minutes" for every limiter (reviews 10 min, suggestions 1 h, admin 15 min): build the message from the response's `Retry-After` ("Try again in about N minutes").
- `<html lang>` is not updated when the language is switched in the app; `document.title` is reset to "Golden Gai Map" on `/map` and `/directory` although the server sends specific titles.
- Characters missing from W95FA fall back to another font: "×", "—", "·" in the admin UI and the sticker's Japanese status bar (one separator is a dot, the other a square). Use glyphs the pixel fonts have, or draw them.

## D. Small behaviour fixes
- `App.vue` centres the Explorer window with `window.innerHeight - 32`, ignoring the 1.25 CSS zoom, so it sits below centre on desktop.
- The Start menu stays open after choosing Admin Mode.
- The "Link copied!" tooltip can outlive its card by up to 2 s.
- Search highlights persist after leaving the map with a query typed (MapSearch remounts empty).
- `hoveredBarId` can stay set if the drawer unmounts on an admin toggle while a card is hovered.
- `GaiChanDialogue` shows broken-image icons when its art fails to load (offline, never seen online): hide failed images.
- `labelOrientation: 'tate'` without `labelTextRotation` renders upside down.
- The manifest theme colour is purple `#4a3065` but `<meta name="theme-color">` is `#0a0810`: use one value in both.
- Mobile bar-card action buttons ("Mark as Visited", "Reviews"…) are 23 px tall unless they share a row with the share button; the offline tray icon and clock stack at ~20 px each on mobile; admin main tabs are under 40 px on mobile. Bring these to the 40 px touch rule without changing the desktop look.

## E. Docs
- `PROJECT_GUIDE.md`: update the structure section for everything added since Wave 1 (utils, map components, service worker, SEO routes, suggestions, stickers), and add the deploy note: `web` and `api` must be updated together (a new `web` with an old `api` answers `/bar/<slug>` with Express's plain 404 page); set `PUBLIC_URL`.
- `npm test` needs `npm ci` in `server/` too: make the root `test` script robust to that or document it in `plans/AGENT_BRIEF.md`.

## Acceptance criteria
- [ ] Build passes with no new warnings; tests pass; the dev seed script still runs against an empty database
- [ ] Main bundle is unchanged or smaller (report sizes before/after)
- [ ] Default map and desktop views are pixel-identical before/after at 1280x800 and 390x844 (except where an item above intentionally changes them — list those)
- [ ] Each item above is either done or listed as skipped with a reason
