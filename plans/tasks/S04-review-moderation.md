# S04: Review moderation (admin delete + report button)

**Phase 2** · Size **M** · Agent ~2–3h · Review ~30 min · Depends on: S02 (limiter), R05 nice-to-have (confirm dialog) · Touches: `server/routes/reviews.js`, `server/migrate.js`, `src/api/reviews.js`, `ReviewPanel.vue`, `ReviewsWindow.vue`, `StickyNote.vue`, `AdminPanel.vue`

## Why
There's no way to remove a review except by editing the database. Sticky notes on the desktop show the last week's reviews to everyone, so one abusive doodle sits on the home screen for 7 days.

## Steps
1. Migration `015-review-moderation`: `ALTER TABLE reviews ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false, ADD COLUMN report_count INT NOT NULL DEFAULT 0;`
2. Endpoints:
   - `DELETE /api/reviews/:id` (admin)
   - `PATCH /api/reviews/:id` `{hidden}` (admin)
   - `POST /api/reviews/:id/report` (public, rate-limited, one per IP per review via an in-memory set or a `review_reports` table). Auto-hide at 3 reports.
3. Public GETs exclude `hidden = true`. Add `GET /api/reviews/admin?status=reported|hidden|all` (admin).
4. UI:
   - A small "⚑ Report" text button on each review (Win95 link style)
   - In admin mode, a "✕ Delete" / "Hide" on each review
   - A new "Reviews" tab in AdminPanel listing reported reviews
5. Confirm destructive actions with a Win95 dialog (R05's `useDialog` if merged, otherwise an inline confirm).

## Acceptance criteria
- [ ] Admin can delete or hide a review from the bar panel and from the admin tab
- [ ] 3 reports from different IPs hide a review from public lists and sticky notes
- [ ] Hidden reviews are still visible in the admin tab
