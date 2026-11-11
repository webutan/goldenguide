# G05: Printable door sticker / QR per bar (admin)

**Phase 4** · Size **S** · Agent ~1.5–2h · Review ~15 min · Depends on: G01 · Touches: `AdminPanel.vue` or `DatabaseTable.vue`, new `src/components/admin/StickerSheet.vue`, `package.json` (`qrcode`)

## Why
A small "Find us on Golden Gai Map" sticker in a bar's window gives free, physical, local distribution, and bar owners like being featured.

## Steps
1. Admin action "🖨 Print sticker" per bar (and "Print all" for a sheet).
2. Sticker design in Win95 style: a tiny window frame with title "GaiMap.exe", the bar name (EN + JP), a QR code to `/bar/<slug>?ref=sticker`, and the line "Rules · Hours · Charge". Use the `qrcode` package to output SVG. Render it crisp, with no anti-aliasing on the pixel font.
3. A print stylesheet: A4 sheet of 8 stickers (2×4) with crop marks, plus a single-sticker mode (90×55 mm business-card size).
4. Count `?ref=sticker` arrivals (a simple counter table or log line) so the owner can see whether stickers work. Coordinate with F10's counter if it has landed.

## Acceptance criteria
- [ ] The print preview (Playwright `page.pdf`) shows 8 scannable QR codes (test-decode one with a QR library)
- [ ] Scanning leads to the correct bar deep link
