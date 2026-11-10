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
