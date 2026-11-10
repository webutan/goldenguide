# R04: Dead code & data cleanup

**Phase 3** · Size **S** · Agent ~1h · Review ~15 min · Depends on: none (do it late to avoid merge noise) · Touches: `sql/`, `src/data/`, `server/migrate.js` (docs only), `GaiChanDialogue.vue`, `public/gaichanidle.png`, `PROJECT_GUIDE.md`

## Why
- `sql/` duplicates migrations 001–006 and is stale (the real ones live in `server/migrate.js`).
- `src/data/bars.json` (76 kB), `bar-groups.json` and `alleys.json` aren't imported by `src/`. Check whether `scripts/` use them before deleting; if they do, move them to `scripts/data/`.
- The `users` and `visited` tables exist but are unused. **Don't drop them**; just document them as reserved.
- `GaiChanDialogue.vue:608` shuffles with `sort(() => Math.random() - 0.5)`, which is biased. Use Fisher–Yates.
- `public/gaichanidle.png` at the root may duplicate `public/gaichan/gaichanidle.png`. Check references first.

## Steps
Verify every deletion with `grep -rn <name> src scripts server public index.html`. Delete or move. Fix the shuffle. Update PROJECT_GUIDE's structure section.

## Acceptance criteria
- [ ] Build passes; the app runs; the scripts that used moved data still resolve their paths
- [ ] Bundle size is unchanged or smaller

Also (found in R07, small window bugs, fix here):
- `App.vue` centres the Explorer window with `window.innerHeight - 32`, ignoring the 1.25 CSS zoom on `#app`, so it sits below centre on desktop.
- A window dragged to the far right in Map view can hide under the bar drawer (fixed, z-index 150), and one parked bottom-right on the desktop hides under Gai-chan. Have those publish a right/bottom inset that `WinWindow`'s clamp subtracts.
- Window z-indexes only ever increment and can eventually pass the drawer's 150; renormalise them.

Also (found in S02):
- `parseTwitterHandle` exists in four copies (`server/lib/feedCore.js`, `BarTwitterPanel.vue`, `BarDrawer.vue`, `BarPopup.vue`). Move the frontend copies into one `src/utils/` helper.
- `FeedWindow.vue` and `BarTwitterPanel.vue` show raw `err.message` / `data.error` strings instead of `t()` keys; an admin viewing an inactive bar's Twitter panel sees "Failed to fetch bar feed" (the feed route now 404s for inactive bars).

Also (found in B09, admin gaps): `removePartition` in AdminPanel can only remove the last slot, and there is no `DELETE /api/partitions/:buildingId`, so a building's split can only be reset in the database. Add both.

Also (found in R01): `hasFloorFilter` and `barFloorMap` in `GoldenGaiMap.vue` are unused; the map tooltip's "cover" and the annotation toolbar strings ("Add label", "English text", "Size", "Rot") bypass `t()`; four ids in `src/data/buildings.json` have no matching `bldg-*` path in `map.svg`, so a bar placed there is unreachable (check production data for bars in those buildings).

Also (found in S04, admin usability):
- Admin mode hides the map Search and Explorer windows on desktop, so moderating from a bar's review panel means opening it before switching admin mode on. Keep search available in admin mode.
- On mobile the Admin Console floats over the desktop icons and has no taskbar button to minimise it.
- A hidden review disappears from the bar panel for admins too; Unhide only exists in the admin Reviews tab. Show hidden reviews greyed-out to admins in place.
- The admin review list is capped at 100 rows without paging and ships full drawing data URLs.
- Sticky notes overlap each other, the desktop icons and Gai-chan, and the lowest run under the taskbar.

Also (found in B10): the 4-slot grid ignores weights; the badge glyph is a fixed size and overflows thin slots; the Start menu stays open after choosing Admin Mode; `centerOnPoint`, `fitToContainer`, `zoomIn`, `zoomOut` still use viewport-px math that ignores the 1.25 CSS zoom (left alone so the default view stayed identical).

Also (found in R02):
- **Drawer hover cost is now the whole hover cost** (~85 of ~95 ms per 50 moves): the drawer swaps its 182-card list for the hovered building's cards and rebuilds all 182 on leave (~60 ms each time the pointer moves from a building onto a road), and `WinScrollContainer` reads `scrollHeight` in `onUpdated`, forcing layout on every re-render. Keep the full list mounted and show the hover preview as a separate layer; measure with R01's method.
- Desktop zoom / fit / locate buttons sit under the always-visible bar drawer and can't be clicked in non-admin mode.
- "Fit" on desktop is 1.25x too large (`fitToContainer`, `initPanzoom`, `centerOnPoint` mix viewport px with layout px under the CSS zoom), so the minimum zoom doesn't show the whole map.
- Releasing a map drag over a building selects it (a click fires after the drag).
- `hoveredBarId` (drawer card → map) still goes through `App.vue`; it can stay set if the drawer unmounts on an admin toggle while a card is hovered.
- Search highlights persist after leaving the map with a query typed (MapSearch remounts empty).
- A failed `reload()` sets `error` and unmounts the whole app tree, map included: keep the last good data and show a Win95 error dialog instead.

Also (found in G01): `src/components/MapBarPanel.vue` is not imported anywhere (dead); the mobile bar card's action buttons ("Mark as Visited", "Reviews"...) are 23 px tall unless they share a row with the share button; the "Link copied!" tooltip can outlive its card by up to 2 s; the first-visit rules balloon overlaps the bottom of the Explorer window at 1280x800 until dismissed; clicking a building on the map does not change the URL (only an opened bar card does).

Also (found in B11): the `labelMode` prop of `GoldenGaiMap.vue` is declared and passed by `App.vue` but never read (tate only exists as a per-building `labelOrientation`); `labelOrientation: 'tate'` without `labelTextRotation` renders upside down; annotations cannot be dragged by touch (mousedown only); double-tap on a building never zooms on mobile because the first tap opens the drawer; Safari `gesturestart`/`gesturechange` (trackpad pinch) is not handled. The desktop-zoom items listed earlier in this file (fit 1.25x too large, buttons under the drawer) moved to B12.

Also (found in G02): `fetchBar()` in `src/api/index.js` is unused; the client resets `document.title` to "Golden Gai Map" on `/map` and `/directory` after boot although the server sends specific titles; `<html lang>` is not updated when the language is switched in the app; an admin opening `/bar/<inactive-slug>` in the browser gets the not-found dialog (page navigations carry no admin header); a bar photo used as `og:image` has no width/height and may be cropped oddly; the default share image has no Japanese line (sharp cannot read the WOFF2 PixelMplus font).

Also (found in B12):
- `DRAWER_WIDTH = 300` in `GoldenGaiMap.vue` mirrors `.bar-drawer { width: 300px }` in `BarDrawer.vue`, and the map assumes the drawer is shown when `!isMobile && !adminMode`. Pass the inset from `App.vue` as a prop instead of duplicating both facts.
- Arrow-key panning (panzoom's) is not clamped to the pan limits and its step uses viewport px.
- The hover tooltip is clamped to the full container, so near the drawer it can open partly under it.
- When the map is rotated, the container corners outside the rotated wrap don't respond to wheel/drag.
- `+/−` and search-select centre on the container centre, which on desktop is right of the middle of the visible (drawer-free) area; consider the visible-area centre.
- Deploy note for PROJECT_GUIDE: `web` and `api` must be updated together. A new `web` with an old `api` (no SEO routes) answers `/bar/<slug>` with Express's plain 404 page.

Also (found in G04):
- Applying a suggestion is two calls (`PATCH /api/bars/:id`, then `PATCH /api/suggestions/:id`), not atomic; if the second fails the suggestion stays open (it then reads "Already matches the current data"). A server-side apply endpoint that reuses the bars update in one transaction would close that.
- The `rateLimited` string says "a few minutes" but the suggestion limit is per hour; give the 429 a retry time from `Retry-After`.
- Gai-chan (z-index 1050) draws over the Start menu (inside the taskbar's z-index 1000 context); on mobile the menu sits right against Gai-chan's CRT.
- The suggestion Hours tab edits `schedule` only; the free-text `hours` / `closed_days` columns that cards also show are not editable.
- Admin main tabs are under 40px high on mobile.
