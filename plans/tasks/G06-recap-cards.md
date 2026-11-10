# G06: Shareable "My Golden Gai Night" recap card

**Phase 5** · Size **M** · Agent ~3h · Review ~20 min · Depends on: F01 (passport data), G01 (links) · Touches: new `src/components/RecapCard.vue`, new `src/utils/recapImage.js`, Passport window

## Why
User-generated, good-looking share images (Instagram Stories, X) bring in new visitors who are already interested.

## Steps
1. Generate a client-side `<canvas>` image in two sizes: 1080×1920 (story) and 1200×630 (post). Content: a Win95 desktop frame, the window "My Night in Golden Gai.txt", the list of bars visited tonight (or all-time) with hanko stamps from F01, the count of streets covered, a mini map silhouette with visited buildings lit, the date, and the footer "gaimap … /bar links". W95FA and PixelMplus must be loaded (`document.fonts.load`) before drawing. Draw pixel-crisp: `imageSmoothingEnabled = false`.
2. "Save image" (download) and "Share…" (`navigator.share` with files where supported).
3. Privacy: only bars the user marked, no location data, and a toggle to hide bar names ("5 bars, 3 streets").

## Acceptance criteria
- [ ] Generated PNGs look sharp at 100% zoom (attach both sizes to the summary)
- [ ] Works with 0, 1 and 12 visited bars (layout doesn't overflow)
- [ ] Japanese names render in PixelMplus
