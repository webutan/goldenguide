# F11: Doodle gallery (`Paint Gallery.exe`)

**Phase 5** · Size **S–M** · Agent ~2h · Review ~15 min · Depends on: S04 (moderation must exist first) · Touches: `server/routes/reviews.js` (gallery endpoint), new `src/components/GalleryWindow.vue`, `DesktopView.vue`, `App.vue`

## Why
Review doodles are charming but disappear after a week on the desktop. A gallery celebrates them and encourages more people to draw.

## Steps
1. `GET /api/reviews/drawings?cursor=` returns reviews with a drawing (not hidden), newest first, 24 per page, without the full `text` if it's large.
2. Window styled like a 90s image viewer: a thumbnail grid in a sunken panel, a status bar "Doodle 12 of 340 · for <bar>", and a viewer pane showing the drawing at 2× with `pixelated` rendering, the bar name (click opens the bar) and the date. Prev / Next buttons and keyboard arrows.
3. Optional "❤" like counter (public, rate-limited, one per browser via localStorage + IP hash) and a "Top this week" tab.
4. Infinite scroll with `IntersectionObserver`. Thumbnails lazy-load.

## Acceptance criteria
- [ ] Gallery paginates smoothly with 200+ seeded drawings
- [ ] Hidden or deleted reviews never appear
- [ ] Mobile: 3-column grid, viewer full screen
