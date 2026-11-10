# R09: Admin usability gaps

**Phase 3** · Size **M** · Agent ~3–4h · Review ~30 min · Depends on: S04, G04, B10 · Touches: `src/App.vue` (admin-mode window rules only), `AdminPanel.vue`, `AdminReviews.vue`, `AdminInbox.vue`, `ReviewPanel.vue`, `server/routes/partitions.js`, `server/routes/suggestions.js`, `server/routes/reviews.js`, `server/routes/bars.js` (shared update helper only)

## Why (all found while building the admin features; each makes day-to-day moderation awkward)
1. **Admin mode hides the map Search and Explorer windows** on desktop, so to moderate a bar's reviews you must open its panel before switching admin mode on.
2. **On mobile the Admin Console floats over the desktop icons and map** and has no taskbar button to minimise or restore it.
3. **A hidden review disappears for admins too** in the bar panel; Unhide only exists in the admin Reviews tab.
4. **The admin review list is capped at 100 rows** with no paging, and ships every drawing as a full data URL.
5. **A building's split can't be reset from the UI:** `removePartition` only removes the last slot, and there is no `DELETE /api/partitions/:buildingId`.
6. **Applying a suggestion is two calls** (`PATCH /api/bars/:id`, then `PATCH /api/suggestions/:id`), not atomic.
7. **An admin opening `/bar/<inactive-slug>`** gets the not-found dialog, because page navigations carry no admin header.

## Steps
1. Keep Search available in admin mode on desktop (the Explorer filter window may stay hidden if it collides with the admin console; decide and say why). Selecting a search result in admin mode must still open the bar card with its Reviews button.
2. Mobile: give the Admin Console a taskbar button and minimise/restore, like other windows.
3. In admin mode, show hidden reviews in place in `ReviewPanel` (greyed, "Hidden" badge, Unhide button). The public API must still exclude them: fetch them through the admin endpoint.
4. Page the admin review list (cursor or offset) and load drawings lazily (thumbnail on demand).
5. Partitions: remove any slot (not only the last), and a confirmed "Reset split" that calls a new admin `DELETE /api/partitions/:buildingId`.
6. Server-side `POST /api/suggestions/:id/apply` that computes the patch from the suggestion against the bar's CURRENT values, updates the bar through the same whitelist/transaction code as `PATCH /api/bars/:id`, and marks the suggestion applied, in one transaction. The Inbox uses it.
7. After an admin logs in while on a not-found deep link (or opens an inactive bar from the admin list), the bar card opens. Don't weaken the public 404.

## Acceptance criteria
- [ ] In admin mode on desktop: search a bar, open its reviews, hide and unhide one, without leaving admin mode
- [ ] Mobile: the Admin Console can be minimised and restored from the taskbar
- [ ] Reset split removes the stored partition (DB row gone) and the building falls back to the automatic split
- [ ] Apply is one request; a forced failure midway leaves both the bar and the suggestion unchanged
- [ ] Public endpoints return exactly what they did before (hidden reviews and inactive bars still excluded)
