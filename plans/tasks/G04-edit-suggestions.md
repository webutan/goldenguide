# G04: "Suggest an edit" (crowd-sourced corrections + admin queue)

**Phase 4** · Size **M** · Agent ~3–4h · Review ~30 min · Depends on: S02 (limiter), R05 (dialogs) · Touches: `server/migrate.js`, new `server/routes/suggestions.js`, `server/index.js`, `src/api/index.js`, new `src/components/SuggestEditDialog.vue`, `BarPopup.vue`, `BarDrawer.vue`, `AdminPanel.vue`

## Why
Bar data goes stale fast (hours, charge, closures). Letting visitors report changes keeps the data fresh, and fresh data is what makes people trust the map and come back.

## Steps
1. Migration `0xx-suggestions`: `bar_suggestions(id, bar_id NULL, kind TEXT CHECK (kind IN ('hours','price','closed','moved','info','new_bar')), payload JSONB, note TEXT, contact TEXT NULL, status TEXT DEFAULT 'open', created_at, ip_hash TEXT)`. Hash the IP with a server secret; never store the raw IP.
2. `POST /api/suggestions` (public, rate-limited 5/hour/IP, payload ≤ 4 kB). Admin: `GET ?status=`, `PATCH /:id {status}`, and "apply", which pre-fills the DatabaseTable row for that bar.
3. UI: a "✎ Suggest edit" link on the bar card opens a Win95 property-sheet dialog with tabs (Hours / Prices / Other). It's pre-filled with the current values, so the user only changes what's wrong. There's also a "Report closed" quick action. Also add a "Know a bar we're missing?" entry in the Start menu.
4. The admin tab "Inbox (N)" lists suggestions with a diff view (old → new) and Apply / Dismiss buttons.
5. Thank-you balloon from Gai-chan after submitting.

## Acceptance criteria
- [ ] A suggestion round-trips from a visitor to the admin inbox, and Apply updates the bar
- [ ] Rate limit works, and no raw IPs are stored
- [ ] JP/EN strings complete
