# F01: Stamp Passport + achievements (`Passport.exe`)

**Phase 5** · Size **M–L** · Agent ~4–5h · Review ~40 min · Depends on: B06, B03 · Touches: new `src/components/PassportWindow.vue`, new `src/composables/usePassport.js`, `useVisited.js`, `DesktopView.vue`, `App.vue`, `useI18n.js`, `public/icons/stamps/`

## Why
Collecting is the core fun loop for a district of ~280 tiny bars. It turns "visited" (already tracked) into a reason to come back.

## Steps
1. Data (local-first, localStorage via B06): extend visited to `{ barId, firstVisit: ISO, visits: n, lastVisit }`, migrating the old array of ids on read. Keep `useVisited`'s API compatible.
2. A "Stamp" is earned when marking visited, or by "Check in" in chat (if `myCheckinBarId` is set). Stamps are generated **hanko**: a red circle or square with 1–2 kanji from the bar's `name_jp` (or initials), rotated ±8°, with a slightly rough ink-edge mask. Render to canvas and cache as a data URL in memory. Original art only.
3. `PassportWindow.vue`: looks like a Win95 app with a menu bar (File / View / Help) and a book-style two-page spread. Each page is one street (Hanazono-1, -3, -5, -8, Maneki-dori, …) as a grid of slots; empty slots show a dotted outline with the bar name. Status bar: "42 / 281 stamps · 3 streets complete".
4. Achievements (each a Win95-style "certificate" dialog with a pixel trophy icon):
   - First Stamp, Night Owl (a visit logged 02:00–05:00 JST)
   - Street Sweeper (one street complete)
   - 5 in One Night (5 stamps with the same "night", 18:00–05:00 JST)
   - Upstairs Explorer (a 2F+ bar), Rule Abider (finished the rules walkthrough)
   - Regular (same bar 3+ nights), Polyglot (switched language)

   An achievement toast slides up from the taskbar tray like a Win95 balloon tip.
5. Desktop icon "Passport" plus a Start-menu entry. The taskbar's existing `visitedCount/totalBars` display links to it.
6. Export/import passport as a `.gaipass` JSON file (File menu), since there are no accounts and this protects against cleared storage.

## Acceptance criteria
- [ ] Old visited data migrates seamlessly
- [ ] Stamps render for JP and EN-only bars
- [ ] Each achievement can be triggered in a test (unit-test the rules in `usePassport`)
- [ ] Mobile: one page per screen, swipe or arrows to turn pages
