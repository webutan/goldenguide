# F06: Live "night activity" glow on the map

**Phase 5** · Size **M** · Agent ~2–3h · Review ~20 min · Depends on: R01 (declarative colours), S02 (check-in limits) · Touches: `server/routes/chat.js`, `src/composables/useChat.js` (or new `usePresence.js`), `GoldenGaiMap.vue` layer, Legend

## Why
Seeing "where the people are tonight" is magnetic, and it's built on the existing chat check-ins.

## Steps
1. Server: expose aggregated, **anonymous** counts only: `presence:counts { [barId]: n }`, broadcast at most every 10 s. Counts below 1 aren't sent. Keep check-ins for 3 h max. They currently vanish when the chat window closes, so make them survive closing the window via a lightweight presence socket that connects on map view, or `POST /api/checkins` + polling. Choose and justify.
2. Users must be able to check in from the bar card ("🍺 I'm here"), not only from chat. Check-out is automatic after 3 h or on leaving.
3. Map: a soft pulsing "lantern" glow (an SVG radial gradient circle, CRT-orange, slow 3 s pulse) over buildings with check-ins; intensity steps 1 / 2–3 / 4+. Toggle it from the map toolbar ("Show activity") and add a Legend entry.
4. Privacy: no names in the aggregate. The "Who's here" list in chat stays opt-in as today.

## Acceptance criteria
- [ ] Two browsers checking into the same bar → that building glows at level 2 in a third browser within 10 s
- [ ] Glow disappears after check-out or timeout
- [ ] Reduced-motion → no pulse
