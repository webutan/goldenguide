# F09: Original desktop mini-game: "Last Order"

**Phase 5** · Size **M** · Agent ~3–4h · Review ~20 min · Depends on: R05 · Touches: new `src/components/games/LastOrder.vue`, `DesktopView.vue` (a "Games" folder icon), `App.vue`

## Why
Win95 desktops had little games, and one gives people a reason to linger and share high scores. It must be an **original** game with original rules and art. Don't clone Minesweeper, Solitaire, etc.

## Concept (original)
"Last Order": a bartender puzzle on a 7-seat counter (Golden Gai bars are tiny). Guests arrive with drink orders shown as pixel icons (highball, sake, beer, shochu, umeshu). You have 3 bottles on the shelf and limited glasses. Tap a guest, then the right bottle, to serve. Each guest has a patience bar. **House-rule cards** appear between rounds ("No photos!" → tap the guest with the camera to politely warn them; "Too loud!" → shush). These tie the game to the real etiquette. The round ends at "last order" (2:00 on an in-game clock). Score = served drinks + manners bonus.

## Steps
1. Implement it on a `<canvas>` or DOM grid inside a `WinWindow` with a Game / Help menu. Original 16×16 pixel sprites (drawn programmatically or in small PNGs you create).
2. Difficulty ramps per round. Local high-score table ("Hall of Fame" dialog with nickname, B06 persistence).
3. Mouse and touch. Pause when the window is minimised or unfocused.
4. Optional: a "share score" text with the site link.

## Acceptance criteria
- [ ] Playable start → game over loop with no console errors
- [ ] Works on a 390 px wide screen
- [ ] All art is original and created in this task
