# B01: Drawing-only reviews fail silently

**Phase 1** · Size **S** · Agent ~1h · Review ~15 min · Depends on: none · Touches: `src/components/ReviewDialog.vue`, `server/routes/reviews.js`, `server/index.js` (JSON limit)

## Why
`ReviewDialog.vue` lets the user submit with only a drawing (`canSubmit` = text **or** canvas) and sends `text: ' '` (around line 110). `POST /api/reviews` rejects blank text with 400 ("text required"). The dialog's `finally` always emits `done`, so the user thinks the review posted, but it was silently dropped. Separately, the server accepts a `drawing` of up to 150 000 chars while `express.json()` uses its default 100 kB limit, so a large drawing gets a 413 before validation runs.

## Steps
1. **Server** (`reviews.js` POST):
   - Accept a review if it has non-blank `text` **or** a valid `drawing`. Store `text` as `''` when there's none (the DB column is `NOT NULL`, so empty string is fine).
   - Validate `drawing` strictly: it must start with `data:image/png;base64,` and be ≤150 000 chars. Otherwise return 400.
   - Validate `barId` is a positive integer.
2. **Server** (`index.js`): `express.json({ limit: '200kb' })`, keeping it consistent with the drawing cap.
3. **Client** (`ReviewDialog.vue`):
   - Send `text: reviewText.value.trim()` (no `' '` hack).
   - On error, don't close. Show the error inside the dialog in Win95 style (a red-icon message row, using `/icons/msg_error-1.png`), keep the user's text and drawing, and re-enable Submit.
   - Only emit `done` on success.
4. Make sure the display components (`ReviewPanel.vue`, `ReviewsWindow.vue`, `StickyNote.vue`) handle empty `text` gracefully: no empty quote box, and the drawing still shows.

## Acceptance criteria
- [ ] Drawing-only review posts and appears in ReviewPanel, ReviewsWindow and the desktop sticky notes
- [ ] Text-only review still works
- [ ] Empty submit is impossible (button disabled)
- [ ] When the server returns an error (simulate by stopping the API), the dialog stays open, shows the message, and keeps the input
- [ ] A non-PNG `drawing` payload sent with curl returns 400
- [ ] Strings are i18n'd (`reviewError` key or similar)
