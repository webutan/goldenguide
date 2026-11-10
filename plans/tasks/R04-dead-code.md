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
